package dev.danvega.codingagent.tool.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AgentToolDto {
    private String id;
    private String name;
    private String description;
    private String method;
    private String host;
    private String endpoint;
    private String requestSchema;
    private String sourceType;
    private String authProfileId;
    private String authType;
    private String authConfig;
    private boolean enabled;
    private Long createdAt;
    private Long updatedAt;
}
