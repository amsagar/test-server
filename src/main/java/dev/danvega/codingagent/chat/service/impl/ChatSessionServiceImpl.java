package dev.danvega.codingagent.chat.service.impl;

import dev.danvega.codingagent.applicationconfig.exceptions.ResourceNotFoundException;
import dev.danvega.codingagent.assistant.service.AssistantService;
import dev.danvega.codingagent.chat.dto.request.UpdateSessionRequest;
import dev.danvega.codingagent.chat.dto.response.ChatMessageDto;
import dev.danvega.codingagent.chat.dto.response.ChatSessionDto;
import dev.danvega.codingagent.chat.entity.ChatSession;
import dev.danvega.codingagent.chat.repo.ChatSessionRepository;
import dev.danvega.codingagent.chat.service.ChatSessionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.messages.MessageType;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
@Slf4j
public class ChatSessionServiceImpl implements ChatSessionService {

    private static final String DEFAULT_TITLE = "New chat";

    private final ChatSessionRepository repository;
    private final ChatMemory chatMemory;
    private final ChatClient titleChatClient;
    private final AssistantService assistantService;

    public ChatSessionServiceImpl(ChatSessionRepository repository,
                                  ChatMemory chatMemory,
                                  @Qualifier("titleChatClient") ChatClient titleChatClient,
                                  AssistantService assistantService) {
        this.repository = repository;
        this.chatMemory = chatMemory;
        this.titleChatClient = titleChatClient;
        this.assistantService = assistantService;
    }

    @Override
    public ChatSessionDto create(String assistantId) {
        long now = Instant.now().getEpochSecond();
        String resolvedAssistantId = (assistantId == null || assistantId.isBlank())
                ? assistantService.defaultAssistantId() : assistantId;
        String id = repository.create(DEFAULT_TITLE, resolvedAssistantId, now);
        log.info("Created chat session {} (assistant {})", id, resolvedAssistantId);
        return repository.findById(id)
                .map(this::toDto)
                .orElseThrow(() -> new IllegalStateException("Session not found after create: " + id));
    }

    @Override
    public List<ChatSessionDto> list(boolean archived) {
        return repository.findByArchived(archived).stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    public List<ChatMessageDto> messages(String id) {
        requireSession(id);
        return chatMemory.get(id).stream()
                .filter(m -> m.getMessageType() == MessageType.USER
                        || m.getMessageType() == MessageType.ASSISTANT)
                .map(m -> new ChatMessageDto(
                        m.getMessageType() == MessageType.USER ? "user" : "assistant",
                        m.getText()))
                .toList();
    }

    @Override
    public ChatSessionDto update(String id, UpdateSessionRequest request) {
        requireSession(id);
        long now = Instant.now().getEpochSecond();
        if (request.getTitle() != null && !request.getTitle().isBlank()) {
            repository.updateTitle(id, request.getTitle().trim(), now);
        }
        if (request.getArchived() != null) {
            repository.updateArchived(id, request.getArchived(), now);
        }
        return repository.findById(id).map(this::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + id));
    }

    @Override
    public void touchAndMaybeTitle(String id, String firstMessage) {
        ChatSession session = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + id));
        long now = Instant.now().getEpochSecond();
        if (DEFAULT_TITLE.equals(session.getTitle()) && firstMessage != null && !firstMessage.isBlank()) {
            repository.updateTitle(id, generateTitle(firstMessage), now);
        } else {
            repository.touch(id, now);
        }
    }

    private String generateTitle(String firstMessage) {
        try {
            String title = titleChatClient.prompt()
                    .user(firstMessage)
                    .call()
                    .content();
            if (title != null && !title.isBlank()) {
                return truncate(title.strip().replaceAll("^[\"']|[\"']$", ""));
            }
        } catch (Exception e) {
            log.warn("Title generation failed, falling back to truncation: {}", e.getMessage());
        }
        return truncate(firstMessage.strip());
    }

    private String truncate(String text) {
        return text.length() > 60 ? text.substring(0, 60).strip() : text;
    }

    @Override
    public void delete(String id) {
        requireSession(id);
        repository.delete(id);
        chatMemory.clear(id);
        log.info("Deleted chat session {}", id);
    }

    @Override
    public String resolveAssistantId(String sessionId) {
        return repository.findById(sessionId)
                .map(ChatSession::getAssistantId)
                .filter(a -> a != null && !a.isBlank())
                .orElseGet(assistantService::defaultAssistantId);
    }

    private void requireSession(String id) {
        if (repository.findById(id).isEmpty()) {
            throw new ResourceNotFoundException("Session not found: " + id);
        }
    }

    private ChatSessionDto toDto(ChatSession s) {
        return ChatSessionDto.builder()
                .id(s.getId())
                .title(s.getTitle())
                .archived(s.isArchived())
                .assistantId(s.getAssistantId())
                .createdAt(s.getCreatedAt())
                .updatedAt(s.getUpdatedAt())
                .build();
    }
}
