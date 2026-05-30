package dev.danvega.codingagent.assistant.dto.request;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.util.List;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UpdateAssistantRequest {
    private String name;
    private String systemPrompt;
    private List<String> builtinTools;
}
