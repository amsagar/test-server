package dev.danvega.codingagent.style.dto.request;

import lombok.Data;

@Data
public class CreateStyleRequest {
    private String name;
    private String description;
    private String instructions;
}
