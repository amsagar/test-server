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
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;

@Service
public class AssistantServiceImpl implements AssistantService {

    private final AssistantRepository repository;
    private final BuiltinToolCatalog builtinToolCatalog;

    public AssistantServiceImpl(AssistantRepository repository,
                                BuiltinToolCatalog builtinToolCatalog) {
        this.repository = repository;
        this.builtinToolCatalog = builtinToolCatalog;
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
    public String defaultAssistantId() {
        return repository.findAll().stream().findFirst()
                .map(Assistant::getId)
                .orElse(null);
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
                .createdAt(a.getCreatedAt())
                .updatedAt(a.getUpdatedAt())
                .build();
    }
}
