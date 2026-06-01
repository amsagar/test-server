package dev.danvega.codingagent.skill.service.impl;

import dev.danvega.codingagent.applicationconfig.exceptions.ResourceNotFoundException;
import dev.danvega.codingagent.assistant.service.AssistantService;
import dev.danvega.codingagent.skill.dto.request.UpdateSkillRequest;
import dev.danvega.codingagent.skill.dto.response.SkillDto;
import dev.danvega.codingagent.skill.entity.AgentSkill;
import dev.danvega.codingagent.skill.repo.AgentSkillRepository;
import dev.danvega.codingagent.skill.service.SkillBundleParser;
import dev.danvega.codingagent.skill.service.SkillBundleParser.ParsedSkill;
import dev.danvega.codingagent.skill.service.SkillService;
import dev.danvega.codingagent.skill.storage.SkillBlobStore;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
public class SkillServiceImpl implements SkillService {

    private final AgentSkillRepository repository;
    private final AssistantService assistantService;
    private final SkillBlobStore blobStore;
    private final SkillBundleParser parser;

    public SkillServiceImpl(AgentSkillRepository repository,
                            AssistantService assistantService,
                            SkillBlobStore blobStore,
                            SkillBundleParser parser) {
        this.repository = repository;
        this.assistantService = assistantService;
        this.blobStore = blobStore;
        this.parser = parser;
    }

    @Override
    public List<SkillDto> list(String assistantId) {
        return repository.findByAssistant(assistantId).stream().map(this::toDto).toList();
    }

    @Override
    public SkillDto get(String id) {
        return toDto(requireEntity(id));
    }

    @Override
    public SkillDto create(String assistantId, MultipartFile file) {
        assistantService.requireEntity(assistantId); // 404 if assistant is unknown
        requireBlob();
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("A SKILL.md or .zip file is required.");
        }
        ParsedSkill parsed = parse(file);
        String name = firstNonBlank(parsed.name(), stripExtension(file.getOriginalFilename()), "Untitled skill");
        String prefix = UUID.randomUUID() + "/";
        uploadAll(prefix, parsed.files());

        long now = Instant.now().getEpochSecond();
        AgentSkill skill = new AgentSkill();
        skill.setAssistantId(assistantId);
        skill.setName(name);
        skill.setDescription(parsed.description());
        skill.setBlobPrefix(prefix);
        skill.setEnabled(true);
        String id = repository.create(skill, now);
        log.info("Created skill {} ({}) for assistant {}", id, name, assistantId);
        return get(id);
    }

    @Override
    public SkillDto update(String id, UpdateSkillRequest request, MultipartFile file) {
        AgentSkill existing = requireEntity(id);
        long now = Instant.now().getEpochSecond();

        if (file != null && !file.isEmpty()) {
            requireBlob();
            ParsedSkill parsed = parse(file);
            // Write the new bundle under a fresh prefix instead of re-uploading into the existing
            // one. On hierarchical-namespace (ADLS Gen2) accounts, deleting then re-uploading into
            // the same prefix fails with 409 DirectoryIsNotEmpty because empty directory markers
            // survive the per-blob delete. A clean prefix never collides; the old one is pruned
            // best-effort afterwards so a stubborn marker can't abort the upload.
            String oldPrefix = existing.getBlobPrefix();
            String newPrefix = UUID.randomUUID() + "/";
            uploadAll(newPrefix, parsed.files());
            existing.setBlobPrefix(newPrefix);
            try {
                blobStore.deletePrefix(oldPrefix);
            } catch (RuntimeException e) {
                log.warn("Uploaded skill {} to new prefix {} but failed to remove old blobs under {}: {}",
                        id, newPrefix, oldPrefix, e.getMessage());
            }
            // The manifest is the source of truth; refresh metadata from frontmatter on re-upload
            // unless the request explicitly overrides it below.
            if (parsed.name() != null && !parsed.name().isBlank()) {
                existing.setName(parsed.name());
            }
            existing.setDescription(parsed.description());
        }

        if (request != null) {
            if (request.getName() != null && !request.getName().isBlank()) {
                existing.setName(request.getName().trim());
            }
            if (request.getDescription() != null) {
                existing.setDescription(request.getDescription());
            }
            if (request.getEnabled() != null) {
                existing.setEnabled(request.getEnabled());
            }
        }

        repository.update(existing, now);
        return get(id);
    }

    @Override
    public void delete(String id) {
        AgentSkill skill = requireEntity(id);
        repository.delete(id);
        try {
            if (blobStore.isConfigured()) {
                blobStore.deletePrefix(skill.getBlobPrefix());
            }
        } catch (RuntimeException e) {
            log.warn("Deleted skill {} row but failed to remove blobs under {}: {}",
                    id, skill.getBlobPrefix(), e.getMessage());
        }
        log.info("Deleted skill {}", id);
    }

    @Override
    public List<AgentSkill> forAssistant(String assistantId) {
        return repository.findEnabledByAssistant(assistantId);
    }

    private AgentSkill requireEntity(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Skill not found: " + id));
    }

    private void requireBlob() {
        if (!blobStore.isConfigured()) {
            throw new IllegalArgumentException(
                    "Azure Blob is not configured. Set azure.storage.blob.connection-string to manage skills.");
        }
    }

    private ParsedSkill parse(MultipartFile file) {
        try {
            return parser.parse(file.getOriginalFilename(), file.getBytes());
        } catch (IOException e) {
            throw new IllegalArgumentException("Could not read uploaded file: " + e.getMessage(), e);
        }
    }

    private void uploadAll(String prefix, Map<String, byte[]> files) {
        files.forEach((relativePath, data) -> blobStore.upload(prefix + relativePath, data));
    }

    private SkillDto toDto(AgentSkill s) {
        return SkillDto.builder()
                .id(s.getId())
                .assistantId(s.getAssistantId())
                .name(s.getName())
                .description(s.getDescription())
                .enabled(s.isEnabled())
                .createdAt(s.getCreatedAt())
                .updatedAt(s.getUpdatedAt())
                .build();
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                return v.trim();
            }
        }
        return "Untitled skill";
    }

    private static String stripExtension(String filename) {
        if (filename == null) {
            return null;
        }
        int dot = filename.lastIndexOf('.');
        return dot > 0 ? filename.substring(0, dot) : filename;
    }
}
