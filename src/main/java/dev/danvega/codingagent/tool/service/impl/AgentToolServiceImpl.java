package dev.danvega.codingagent.tool.service.impl;

import dev.danvega.codingagent.applicationconfig.exceptions.ResourceNotFoundException;
import dev.danvega.codingagent.tool.dto.request.CreateToolRequest;
import dev.danvega.codingagent.tool.dto.request.TestToolRequest;
import dev.danvega.codingagent.tool.dto.request.UpdateToolRequest;
import dev.danvega.codingagent.tool.dto.response.AgentToolDto;
import dev.danvega.codingagent.tool.dto.response.TestToolResult;
import dev.danvega.codingagent.tool.entity.AgentTool;
import dev.danvega.codingagent.tool.repo.AgentToolRepository;
import dev.danvega.codingagent.tool.runtime.HttpToolExecutor;
import dev.danvega.codingagent.tool.service.AgentToolService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
@Slf4j
public class AgentToolServiceImpl implements AgentToolService {

    private final AgentToolRepository repository;
    private final HttpToolExecutor executor;

    public AgentToolServiceImpl(AgentToolRepository repository, HttpToolExecutor executor) {
        this.repository = repository;
        this.executor = executor;
    }

    @Override
    public List<AgentToolDto> list() {
        return repository.findAll().stream().map(this::toDto).toList();
    }

    @Override
    public AgentToolDto get(String id) {
        return toDto(requireEntity(id));
    }

    @Override
    public AgentToolDto create(CreateToolRequest request) {
        long now = Instant.now().getEpochSecond();
        AgentTool tool = new AgentTool();
        tool.setName(required(request.getName(), "name"));
        tool.setDescription(request.getDescription());
        tool.setMethod(normalizeMethod(request.getMethod()));
        tool.setHost(required(request.getHost(), "host"));
        tool.setEndpoint(request.getEndpoint() == null ? "" : request.getEndpoint());
        tool.setRequestSchema(request.getRequestSchema());
        tool.setSourceType("manual");
        tool.setAuthProfileId(blankToNull(request.getAuthProfileId()));
        tool.setAuthType(request.getAuthType() == null ? "none" : request.getAuthType());
        tool.setAuthConfig(request.getAuthConfig());
        tool.setEnabled(request.getEnabled() == null || request.getEnabled());
        String id = repository.create(tool, now);
        log.info("Created HTTP tool {} ({})", id, tool.getName());
        return get(id);
    }

    @Override
    public AgentToolDto update(String id, UpdateToolRequest request) {
        AgentTool existing = requireEntity(id);
        long now = Instant.now().getEpochSecond();
        if (request.getName() != null && !request.getName().isBlank()) {
            existing.setName(request.getName().trim());
        }
        if (request.getDescription() != null) {
            existing.setDescription(request.getDescription());
        }
        if (request.getMethod() != null) {
            existing.setMethod(normalizeMethod(request.getMethod()));
        }
        if (request.getHost() != null && !request.getHost().isBlank()) {
            existing.setHost(request.getHost().trim());
        }
        if (request.getEndpoint() != null) {
            existing.setEndpoint(request.getEndpoint());
        }
        if (request.getRequestSchema() != null) {
            existing.setRequestSchema(request.getRequestSchema());
        }
        if (request.getAuthProfileId() != null) {
            existing.setAuthProfileId(blankToNull(request.getAuthProfileId()));
        }
        if (request.getAuthType() != null) {
            existing.setAuthType(request.getAuthType());
        }
        if (request.getAuthConfig() != null) {
            existing.setAuthConfig(request.getAuthConfig());
        }
        if (request.getEnabled() != null) {
            existing.setEnabled(request.getEnabled());
        }
        repository.update(existing, now);
        return get(id);
    }

    @Override
    public void delete(String id) {
        requireEntity(id);
        repository.delete(id);
        log.info("Deleted HTTP tool {}", id);
    }

    @Override
    public TestToolResult test(String id, TestToolRequest request) {
        AgentTool tool = requireEntity(id);
        String input = request == null || request.getInput() == null ? "{}" : request.getInput();
        try {
            return new TestToolResult(true, executor.execute(tool, input));
        } catch (RuntimeException e) {
            return new TestToolResult(false, e.getMessage());
        }
    }

    @Override
    public AgentTool requireEntity(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tool not found: " + id));
    }

    @Override
    public List<AgentTool> forAssistant(String assistantId) {
        return repository.findByAssistant(assistantId);
    }

    @Override
    public AgentToolDto persistImported(AgentTool tool) {
        long now = Instant.now().getEpochSecond();
        if (tool.getMethod() == null || tool.getMethod().isBlank()) {
            tool.setMethod("GET");
        }
        if (tool.getAuthType() == null) {
            tool.setAuthType("none");
        }
        tool.setEnabled(true);
        String id = repository.create(tool, now);
        return get(id);
    }

    private AgentToolDto toDto(AgentTool t) {
        return AgentToolDto.builder()
                .id(t.getId())
                .name(t.getName())
                .description(t.getDescription())
                .method(t.getMethod())
                .host(t.getHost())
                .endpoint(t.getEndpoint())
                .requestSchema(t.getRequestSchema())
                .sourceType(t.getSourceType())
                .authProfileId(t.getAuthProfileId())
                .authType(t.getAuthType())
                .authConfig(t.getAuthConfig())
                .enabled(t.isEnabled())
                .createdAt(t.getCreatedAt())
                .updatedAt(t.getUpdatedAt())
                .build();
    }

    private static String normalizeMethod(String method) {
        return method == null || method.isBlank() ? "GET" : method.trim().toUpperCase();
    }

    private static String required(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Tool " + field + " is required");
        }
        return value.trim();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
