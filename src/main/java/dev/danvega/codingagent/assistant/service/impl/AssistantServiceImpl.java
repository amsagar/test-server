package dev.danvega.codingagent.assistant.service.impl;

import dev.danvega.codingagent.applicationconfig.exceptions.ResourceNotFoundException;
import dev.danvega.codingagent.assistant.dto.request.CreateAssistantRequest;
import dev.danvega.codingagent.assistant.dto.request.UpdateAssistantRequest;
import dev.danvega.codingagent.assistant.dto.response.AssistantDto;
import dev.danvega.codingagent.assistant.dto.response.BuiltinToolDto;
import dev.danvega.codingagent.assistant.entity.Assistant;
import dev.danvega.codingagent.assistant.repo.AssistantRepository;
import dev.danvega.codingagent.assistant.service.AssistantService;
import dev.danvega.codingagent.chat.tooling.BuiltinToolCatalog;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.StreamUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;

@Service
@Slf4j
public class AssistantServiceImpl implements AssistantService {

    private final AssistantRepository repository;
    private final BuiltinToolCatalog builtinToolCatalog;
    private final Resource defaultPrompt;

    public AssistantServiceImpl(AssistantRepository repository,
                                BuiltinToolCatalog builtinToolCatalog,
                                @Value("classpath:prompts/coding-assistant-system.md") Resource defaultPrompt) {
        this.repository = repository;
        this.builtinToolCatalog = builtinToolCatalog;
        this.defaultPrompt = defaultPrompt;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void bootstrapDefault() {
        if (repository.count() > 0) {
            return;
        }
        long now = Instant.now().getEpochSecond();
        repository.create("Coding Assistant", readDefaultPrompt(),
                String.join(",", builtinToolCatalog.keys()), now);
        log.info("Seeded default 'Coding Assistant'");
    }

    @Override
    public List<AssistantDto> list() {
        return repository.findAll().stream().map(this::toDto).toList();
    }

    @Override
    public AssistantDto get(String id) {
        return toDto(requireEntity(id));
    }

    @Override
    public AssistantDto create(CreateAssistantRequest request) {
        long now = Instant.now().getEpochSecond();
        String name = request.getName() == null || request.getName().isBlank()
                ? "New assistant" : request.getName().trim();
        String prompt = request.getSystemPrompt() == null ? "" : request.getSystemPrompt();
        String id = repository.create(name, prompt, joinBuiltins(request.getBuiltinTools()), now);
        syncToolIds(id, request.getToolIds());
        return get(id);
    }

    @Override
    public AssistantDto update(String id, UpdateAssistantRequest request) {
        Assistant existing = requireEntity(id);
        long now = Instant.now().getEpochSecond();
        String name = request.getName() != null && !request.getName().isBlank()
                ? request.getName().trim() : existing.getName();
        String prompt = request.getSystemPrompt() != null ? request.getSystemPrompt() : existing.getSystemPrompt();
        String builtins = request.getBuiltinTools() != null
                ? joinBuiltins(request.getBuiltinTools()) : existing.getBuiltinTools();
        repository.update(id, name, prompt, builtins, now);
        if (request.getToolIds() != null) {
            syncToolIds(id, request.getToolIds());
        }
        return get(id);
    }

    @Override
    public void delete(String id) {
        requireEntity(id);
        repository.delete(id);
    }

    @Override
    public List<BuiltinToolDto> builtinCatalog() {
        return builtinToolCatalog.catalog();
    }

    @Override
    public Assistant requireEntity(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Assistant not found: " + id));
    }

    @Override
    public List<String> builtinToolKeys(Assistant assistant) {
        if (assistant.getBuiltinTools() == null || assistant.getBuiltinTools().isBlank()) {
            return List.of();
        }
        return Arrays.stream(assistant.getBuiltinTools().split(","))
                .map(String::trim).filter(s -> !s.isBlank()).toList();
    }

    @Override
    public List<String> toolIdsFor(String assistantId) {
        return repository.findToolIds(assistantId);
    }

    @Override
    public String defaultAssistantId() {
        return repository.findAll().stream().findFirst()
                .map(Assistant::getId)
                .orElse(null);
    }

    private void syncToolIds(String assistantId, List<String> toolIds) {
        repository.clearTools(assistantId);
        if (toolIds != null) {
            toolIds.stream().filter(t -> t != null && !t.isBlank())
                    .forEach(t -> repository.addTool(assistantId, t.trim()));
        }
    }

    private String joinBuiltins(List<String> builtins) {
        if (builtins == null) {
            return "";
        }
        return String.join(",", builtins.stream().filter(b -> b != null && !b.isBlank()).map(String::trim).toList());
    }

    private AssistantDto toDto(Assistant a) {
        return AssistantDto.builder()
                .id(a.getId())
                .name(a.getName())
                .systemPrompt(a.getSystemPrompt())
                .builtinTools(builtinToolKeys(a))
                .toolIds(repository.findToolIds(a.getId()))
                .createdAt(a.getCreatedAt())
                .updatedAt(a.getUpdatedAt())
                .build();
    }

    private String readDefaultPrompt() {
        try {
            return StreamUtils.copyToString(defaultPrompt.getInputStream(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            log.warn("Could not read default prompt: {}", e.getMessage());
            return "You are a helpful assistant.";
        }
    }
}
