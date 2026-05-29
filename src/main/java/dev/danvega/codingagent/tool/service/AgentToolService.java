package dev.danvega.codingagent.tool.service;

import dev.danvega.codingagent.tool.dto.request.CreateToolRequest;
import dev.danvega.codingagent.tool.dto.request.TestToolRequest;
import dev.danvega.codingagent.tool.dto.request.UpdateToolRequest;
import dev.danvega.codingagent.tool.dto.response.AgentToolDto;
import dev.danvega.codingagent.tool.dto.response.TestToolResult;
import dev.danvega.codingagent.tool.entity.AgentTool;

import java.util.List;

public interface AgentToolService {

    List<AgentToolDto> list();

    AgentToolDto get(String id);

    AgentToolDto create(CreateToolRequest request);

    AgentToolDto update(String id, UpdateToolRequest request);

    void delete(String id);

    TestToolResult test(String id, TestToolRequest request);

    AgentTool requireEntity(String id);

    List<AgentTool> forAssistant(String assistantId);

    AgentToolDto persistImported(AgentTool tool);
}
