package dev.danvega.codingagent.tool.imports.dto;

import dev.danvega.codingagent.tool.dto.response.AgentToolDto;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class ImportResult {
    private int count;
    private List<AgentToolDto> tools;
}
