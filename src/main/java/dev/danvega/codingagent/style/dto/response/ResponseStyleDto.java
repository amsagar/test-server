package dev.danvega.codingagent.style.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ResponseStyleDto {
    private String id;
    private String name;
    private String description;
    private String instructions;
    private Long createdAt;
    private Long updatedAt;
}
