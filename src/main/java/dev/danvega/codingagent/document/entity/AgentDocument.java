package dev.danvega.codingagent.document.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AgentDocument {
    private String id;
    private String assistantId;
    private String name;
    private String blobPrefix;
    private int chunkCount;
    private boolean enabled;
    private Long createdAt;
    private Long updatedAt;
}
