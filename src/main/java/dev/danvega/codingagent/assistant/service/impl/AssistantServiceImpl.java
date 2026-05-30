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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;

@Service
public class AssistantServiceImpl implements AssistantService {

    private static final Logger log = LoggerFactory.getLogger(AssistantServiceImpl.class);

    private final AssistantRepository repository;
    private final BuiltinToolCatalog builtinToolCatalog;
    // RAG chunks live in the Spring-managed vector_store (no FK to assistant), so they are not
    // removed by the ON DELETE CASCADE that clears agent_document rows. Purge them explicitly.
    // Injected lazily via ObjectProvider to avoid a hard dependency at startup.
    private final ObjectProvider<VectorStore> vectorStoreProvider;

    public AssistantServiceImpl(AssistantRepository repository,
                                BuiltinToolCatalog builtinToolCatalog,
                                ObjectProvider<VectorStore> vectorStoreProvider) {
        this.repository = repository;
        this.builtinToolCatalog = builtinToolCatalog;
        this.vectorStoreProvider = vectorStoreProvider;
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
        // Purge this assistant's RAG chunks before the row goes (cascade clears agent_document rows
        // but not the vector_store chunks, which are keyed by metadata rather than an FK).
        VectorStore vectorStore = vectorStoreProvider.getIfAvailable();
        if (vectorStore != null) {
            try {
                vectorStore.delete("assistant_id == '" + id + "'");
            } catch (RuntimeException e) {
                log.warn("Failed to purge RAG chunks for assistant {}: {}", id, e.getMessage());
            }
        }
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
