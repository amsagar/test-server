package dev.danvega.codingagent.chat.controller;

import dev.danvega.codingagent.applicationconfig.constants.ApiConstants;
import dev.danvega.codingagent.chat.dto.request.UpdateSessionRequest;
import dev.danvega.codingagent.chat.dto.response.ChatMessageDto;
import dev.danvega.codingagent.chat.dto.response.ChatSessionDto;
import dev.danvega.codingagent.chat.service.ChatSessionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping(ApiConstants.SESSIONS_PATH)
@CrossOrigin(origins = "*")
public class ChatSessionController {

    private final ChatSessionService chatSessionService;

    public ChatSessionController(ChatSessionService chatSessionService) {
        this.chatSessionService = chatSessionService;
    }

    @PostMapping
    public ResponseEntity<ChatSessionDto> create() {
        return ResponseEntity.ok(chatSessionService.create());
    }

    @GetMapping
    public ResponseEntity<List<ChatSessionDto>> list(
            @RequestParam(defaultValue = "false") boolean archived) {
        return ResponseEntity.ok(chatSessionService.list(archived));
    }

    @GetMapping("/{id}/messages")
    public ResponseEntity<List<ChatMessageDto>> messages(@PathVariable String id) {
        return ResponseEntity.ok(chatSessionService.messages(id));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ChatSessionDto> update(@PathVariable String id,
                                                 @RequestBody UpdateSessionRequest request) {
        return ResponseEntity.ok(chatSessionService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        chatSessionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
