package dev.danvega.codingagent.document.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DocumentDto {
    private String id;
    private String assistantId;
    private String name;
    private int chunkCount;
    private boolean enabled;
    private Long createdAt;
    private Long updatedAt;
}
