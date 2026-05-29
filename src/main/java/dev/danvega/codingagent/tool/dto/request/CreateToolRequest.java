package dev.danvega.codingagent.tool.dto.request;

import lombok.Data;

@Data
public class CreateToolRequest {
    private String name;
    private String description;
    private String method;
    private String host;
    private String endpoint;
    private String requestSchema;
    private String authProfileId;
    private String authType;
    private String authConfig;
    private Boolean enabled;
}
