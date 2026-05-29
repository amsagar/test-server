package dev.danvega.codingagent.assistant.service;

import dev.danvega.codingagent.assistant.dto.request.CreateAssistantRequest;
import dev.danvega.codingagent.assistant.dto.request.UpdateAssistantRequest;
import dev.danvega.codingagent.assistant.dto.response.AssistantDto;
import dev.danvega.codingagent.assistant.dto.response.BuiltinToolDto;
import dev.danvega.codingagent.assistant.entity.Assistant;

import java.util.List;

public interface AssistantService {

    List<AssistantDto> list();

    AssistantDto get(String id);

    AssistantDto create(CreateAssistantRequest request);

    AssistantDto update(String id, UpdateAssistantRequest request);

    void delete(String id);

    List<BuiltinToolDto> builtinCatalog();

    Assistant requireEntity(String id);

    List<String> builtinToolKeys(Assistant assistant);

    List<String> toolIdsFor(String assistantId);

    String defaultAssistantId();
}
