package dev.danvega.codingagent.chat.service;

import dev.danvega.codingagent.chat.dto.request.UpdateSessionRequest;
import dev.danvega.codingagent.chat.dto.response.ChatMessageDto;
import dev.danvega.codingagent.chat.dto.response.ChatSessionDto;

import java.util.List;

public interface ChatSessionService {

    ChatSessionDto create(String assistantId);

    List<ChatSessionDto> list(boolean archived);

    List<ChatMessageDto> messages(String id);

    ChatSessionDto update(String id, UpdateSessionRequest request);

    void touchAndMaybeTitle(String id, String firstMessage);

    void delete(String id);

    String resolveAssistantId(String sessionId);
}
