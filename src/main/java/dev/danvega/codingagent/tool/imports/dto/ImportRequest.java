package dev.danvega.codingagent.tool.imports.dto;

import lombok.Data;

@Data
public class ImportRequest {
    private String content;
    private String host;
}
