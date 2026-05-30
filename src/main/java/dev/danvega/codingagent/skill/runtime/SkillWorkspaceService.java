package dev.danvega.codingagent.skill.runtime;

import dev.danvega.codingagent.skill.entity.AgentSkill;
import dev.danvega.codingagent.skill.service.SkillService;
import dev.danvega.codingagent.skill.storage.SkillBlobStore;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.List;

/**
 * Materializes an assistant's enabled skills from Blob storage into a fresh temporary
 * directory so the {@code SkillsTool}/{@code FileSystemTools}/{@code ShellTools} can act on
 * real files on disk. One workspace is created per chat turn and deleted when the turn ends.
 *
 * <p>Layout: {@code <workspace>/<skillId>/SKILL.md}, {@code <workspace>/<skillId>/scripts/foo.py}, …
 * — each skill lives in its own subfolder so {@code SkillsTool} (which scans subfolders for a
 * {@code SKILL.md}) discovers them all.
 */
@Service
@Slf4j
public class SkillWorkspaceService {

    private final SkillService skillService;
    private final SkillBlobStore blobStore;

    public SkillWorkspaceService(SkillService skillService, SkillBlobStore blobStore) {
        this.skillService = skillService;
        this.blobStore = blobStore;
    }

    /**
     * Downloads every enabled skill for the assistant into a new temp dir and returns its root,
     * or {@code null} when there are no skills to materialize (or Blob is not configured).
     */
    public Path materialize(String assistantId) {
        if (assistantId == null || !blobStore.isConfigured()) {
            return null;
        }
        List<AgentSkill> skills = skillService.forAssistant(assistantId);
        if (skills.isEmpty()) {
            return null;
        }

        Path workspace;
        try {
            workspace = Files.createTempDirectory("agent-skills-");
        } catch (IOException e) {
            log.warn("Could not create skill workspace for assistant {}: {}", assistantId, e.getMessage());
            return null;
        }

        int materialized = 0;
        for (AgentSkill skill : skills) {
            String prefix = skill.getBlobPrefix();
            Path skillRoot = workspace.resolve(skill.getId());
            try {
                for (String blobName : blobStore.list(prefix)) {
                    String relative = blobName.substring(prefix.length());
                    if (relative.isBlank()) {
                        continue;
                    }
                    Path target = skillRoot.resolve(relative).normalize();
                    if (!target.startsWith(skillRoot)) {
                        log.warn("Skipping blob {} that escapes skill root", blobName);
                        continue;
                    }
                    Files.createDirectories(target.getParent());
                    Files.write(target, blobStore.download(blobName));
                }
                materialized++;
            } catch (IOException | RuntimeException e) {
                log.warn("Failed to materialize skill {} ({}): {}", skill.getId(), skill.getName(), e.getMessage());
            }
        }

        if (materialized == 0) {
            cleanup(workspace);
            return null;
        }
        log.debug("Materialized {} skill(s) for assistant {} into {}", materialized, assistantId, workspace);
        return workspace;
    }

    /** Recursively deletes the workspace; safe to call with {@code null}. */
    public void cleanup(Path workspace) {
        if (workspace == null) {
            return;
        }
        try (var paths = Files.walk(workspace)) {
            paths.sorted(Comparator.reverseOrder()).forEach(p -> {
                try {
                    Files.deleteIfExists(p);
                } catch (IOException e) {
                    log.warn("Could not delete {}: {}", p, e.getMessage());
                }
            });
        } catch (IOException e) {
            log.warn("Could not clean up skill workspace {}: {}", workspace, e.getMessage());
        }
    }
}
