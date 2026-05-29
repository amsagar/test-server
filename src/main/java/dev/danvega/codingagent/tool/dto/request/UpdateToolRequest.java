package dev.danvega.codingagent.tool.dto.request;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UpdateToolRequest {
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
