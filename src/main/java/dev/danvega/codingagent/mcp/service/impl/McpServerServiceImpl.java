package dev.danvega.codingagent.mcp.service.impl;

import dev.danvega.codingagent.applicationconfig.exceptions.ResourceNotFoundException;
import dev.danvega.codingagent.mcp.dto.request.CreateMcpServerRequest;
import dev.danvega.codingagent.mcp.dto.request.UpdateMcpServerRequest;
import dev.danvega.codingagent.mcp.dto.response.McpServerDto;
import dev.danvega.codingagent.mcp.dto.response.McpServerToolDto;
import dev.danvega.codingagent.mcp.entity.McpServer;
import dev.danvega.codingagent.mcp.entity.McpServerTool;
import dev.danvega.codingagent.mcp.repo.McpServerRepository;
import dev.danvega.codingagent.mcp.repo.McpServerToolRepository;
import dev.danvega.codingagent.mcp.runtime.McpClientFactory;
import dev.danvega.codingagent.mcp.service.McpServerService;
import dev.danvega.codingagent.tool.auth.service.EncryptionService;
import io.modelcontextprotocol.spec.McpSchema;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.List;

@Service
@Slf4j
public class McpServerServiceImpl implements McpServerService {

    private static final List<String> VALID_TRANSPORTS = List.of("streamable_http", "sse");

    private final McpServerRepository serverRepository;
    private final McpServerToolRepository serverToolRepository;
    private final McpClientFactory clientFactory;
    private final EncryptionService encryptionService;
    private final ObjectMapper objectMapper;

    public McpServerServiceImpl(McpServerRepository serverRepository,
                                McpServerToolRepository serverToolRepository,
                                McpClientFactory clientFactory,
                                EncryptionService encryptionService,
                                ObjectMapper objectMapper) {
        this.serverRepository = serverRepository;
        this.serverToolRepository = serverToolRepository;
        this.clientFactory = clientFactory;
        this.encryptionService = encryptionService;
        this.objectMapper = objectMapper;
    }

    @Override
    public List<McpServerDto> list(String assistantId) {
        return serverRepository.findByAssistant(assistantId).stream()
                .map(s -> toDto(s, null))
                .toList();
    }

    @Override
    public McpServerDto get(String id) {
        McpServer server = requireEntity(id);
        return toDto(server, serverToolRepository.findByServer(id));
    }

    @Override
    public McpServerDto create(String assistantId, CreateMcpServerRequest request) {
        long now = Instant.now().getEpochSecond();
        McpServer s = new McpServer();
        s.setAssistantId(assistantId);
        s.setName(required(request.getName(), "name"));
        s.setDescription(request.getDescription());
        s.setTransport(validTransport(request.getTransport()));
        s.setUrl(required(request.getUrl(), "url"));
        s.setSseEndpoint(blankToNull(request.getSseEndpoint()));
        s.setAuthType(request.getAuthType() == null || request.getAuthType().isBlank() ? "none" : request.getAuthType().trim());
        s.setAuthConfig(blankToNull(request.getAuthConfig()));
        s.setEncryptedSecret(encryptSecret(request.getSecret()));
        s.setEnabled(request.getEnabled() == null || request.getEnabled());
        String id = serverRepository.create(s, now);
        log.info("Created MCP server {} ({}) for assistant {}", id, s.getName(), assistantId);
        return get(id);
    }

    @Override
    public McpServerDto update(String id, UpdateMcpServerRequest request) {
        McpServer existing = requireEntity(id);
        long now = Instant.now().getEpochSecond();
        if (request.getName() != null && !request.getName().isBlank()) {
            existing.setName(request.getName().trim());
        }
        if (request.getDescription() != null) {
            existing.setDescription(request.getDescription());
        }
        if (request.getTransport() != null && !request.getTransport().isBlank()) {
            existing.setTransport(validTransport(request.getTransport()));
        }
        if (request.getUrl() != null && !request.getUrl().isBlank()) {
            existing.setUrl(request.getUrl().trim());
        }
        if (request.getSseEndpoint() != null) {
            existing.setSseEndpoint(blankToNull(request.getSseEndpoint()));
        }
        if (request.getAuthType() != null && !request.getAuthType().isBlank()) {
            existing.setAuthType(request.getAuthType().trim());
        }
        if (request.getAuthConfig() != null) {
            existing.setAuthConfig(blankToNull(request.getAuthConfig()));
        }
        // null secret => keep existing; non-null => replace (blank clears).
        if (request.getSecret() != null) {
            existing.setEncryptedSecret(encryptSecret(request.getSecret()));
        }
        if (request.getEnabled() != null) {
            existing.setEnabled(request.getEnabled());
        }
        serverRepository.update(existing, now);
        return get(id);
    }

    @Override
    public void delete(String id) {
        requireEntity(id);
        serverRepository.delete(id);
        log.info("Deleted MCP server {}", id);
    }

    @Override
    public McpServerDto discover(String id) {
        McpServer server = requireEntity(id);
        long now = Instant.now().getEpochSecond();
        try {
            List<McpSchema.Tool> tools = clientFactory.discover(server);
            for (McpSchema.Tool tool : tools) {
                serverToolRepository.upsert(id, tool.name(), tool.description(), schemaJson(tool), now);
            }
            serverRepository.updateStatus(id, "connected",
                    tools.size() + " tool(s) discovered", now);
            log.info("Discovered {} tool(s) from MCP server {}", tools.size(), server.getName());
        } catch (Exception e) {
            log.warn("MCP discovery failed for server {}: {}", server.getName(), e.getMessage());
            serverRepository.updateStatus(id, "error", e.getMessage(), now);
        }
        return get(id);
    }

    @Override
    public List<McpServerToolDto> listTools(String id) {
        requireEntity(id);
        return serverToolRepository.findByServer(id).stream().map(this::toToolDto).toList();
    }

    @Override
    public McpServerToolDto setToolEnabled(String toolId, boolean enabled) {
        McpServerTool tool = serverToolRepository.findById(toolId)
                .orElseThrow(() -> new ResourceNotFoundException("MCP tool not found: " + toolId));
        serverToolRepository.setEnabled(toolId, enabled, Instant.now().getEpochSecond());
        tool.setEnabled(enabled);
        return toToolDto(tool);
    }

    private McpServer requireEntity(String id) {
        return serverRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MCP server not found: " + id));
    }

    private String encryptSecret(String secret) {
        if (secret == null || secret.isBlank()) {
            return null;
        }
        return encryptionService.encrypt(secret);
    }

    private String schemaJson(McpSchema.Tool tool) {
        try {
            return tool.inputSchema() == null ? null : objectMapper.writeValueAsString(tool.inputSchema());
        } catch (Exception e) {
            return null;
        }
    }

    private String validTransport(String transport) {
        String t = transport == null || transport.isBlank() ? "streamable_http" : transport.trim();
        if (!VALID_TRANSPORTS.contains(t)) {
            throw new IllegalArgumentException("Unsupported transport: " + t);
        }
        return t;
    }

    private McpServerDto toDto(McpServer s, List<McpServerTool> tools) {
        return McpServerDto.builder()
                .id(s.getId())
                .assistantId(s.getAssistantId())
                .name(s.getName())
                .description(s.getDescription())
                .transport(s.getTransport())
                .url(s.getUrl())
                .sseEndpoint(s.getSseEndpoint())
                .authType(s.getAuthType())
                .authConfig(s.getAuthConfig())
                .hasSecret(s.getEncryptedSecret() != null && !s.getEncryptedSecret().isBlank())
                .enabled(s.isEnabled())
                .status(s.getStatus())
                .statusDetail(s.getStatusDetail())
                .createdAt(s.getCreatedAt())
                .updatedAt(s.getUpdatedAt())
                .tools(tools == null ? null : tools.stream().map(this::toToolDto).toList())
                .build();
    }

    private McpServerToolDto toToolDto(McpServerTool t) {
        return McpServerToolDto.builder()
                .id(t.getId())
                .serverId(t.getServerId())
                .name(t.getName())
                .description(t.getDescription())
                .inputSchema(t.getInputSchema())
                .enabled(t.isEnabled())
                .createdAt(t.getCreatedAt())
                .updatedAt(t.getUpdatedAt())
                .build();
    }

    private static String required(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("MCP server " + field + " is required");
        }
        return value.trim();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
