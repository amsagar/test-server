package dev.danvega.codingagent.assistant.dto.request;

import lombok.Data;

import java.util.List;

@Data
public class CreateAssistantRequest {
    private String name;
    private String systemPrompt;
    private List<String> builtinTools;
    private List<String> toolIds;
}
