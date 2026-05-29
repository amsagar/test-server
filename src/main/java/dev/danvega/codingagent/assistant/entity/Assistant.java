package dev.danvega.codingagent.assistant.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class Assistant {
    private String id;
    private String name;
    private String systemPrompt;
    private String builtinTools;
    private Long createdAt;
    private Long updatedAt;
}
