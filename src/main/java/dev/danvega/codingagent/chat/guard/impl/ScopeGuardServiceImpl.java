package dev.danvega.codingagent.chat.guard.impl;

import dev.danvega.codingagent.chat.guard.ScopeGuardService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.MessageType;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@Slf4j
public class ScopeGuardServiceImpl implements ScopeGuardService {

    /** How many trailing messages of context to give the classifier for follow-up disambiguation. */
    private static final int HISTORY_TAIL = 6;

    private static final String DEFAULT_REDIRECT =
            "That request is outside what I'm set up to help with. Let me know if there's something "
                    + "within my area I can do for you.";

    private final boolean enabled;
    private final ChatClient scopeGuardChatClient;

    public ScopeGuardServiceImpl(@Value("${agent.scope-guard.enabled:true}") boolean enabled,
                                 @Qualifier("scopeGuardChatClient") ChatClient scopeGuardChatClient) {
        this.enabled = enabled;
        this.scopeGuardChatClient = scopeGuardChatClient;
    }

    @Override
    public Decision check(String assistantRole, List<String> toolSummaries,
                          List<Message> recentHistory, String userMessage) {
        if (!enabled || assistantRole == null || assistantRole.isBlank()
                || userMessage == null || userMessage.isBlank()) {
            return Decision.allow();
        }
        try {
            String prompt = buildPrompt(assistantRole, toolSummaries, recentHistory, userMessage);
            String raw = scopeGuardChatClient.prompt().user(prompt).call().content();
            return parse(raw);
        } catch (Exception e) {
            // Fail open: never break chat because the classifier hiccuped.
            log.warn("Scope guard classification failed, allowing message through: {}", e.getMessage());
            return Decision.allow();
        }
    }

    private Decision parse(String raw) {
        if (raw == null || raw.isBlank()) {
            return Decision.allow();
        }
        String trimmed = raw.strip();
        if (trimmed.regionMatches(true, 0, "ALLOW", 0, "ALLOW".length())) {
            return Decision.allow();
        }
        String redirect = trimmed;
        int colon = trimmed.indexOf(':');
        if (trimmed.regionMatches(true, 0, "BLOCK", 0, "BLOCK".length()) && colon >= 0) {
            redirect = trimmed.substring(colon + 1).strip();
        }
        if (redirect.isBlank()) {
            redirect = DEFAULT_REDIRECT;
        }
        return Decision.block(redirect);
    }

    private String buildPrompt(String assistantRole, List<String> toolSummaries,
                               List<Message> recentHistory, String userMessage) {
        StringBuilder sb = new StringBuilder();
        sb.append("ROLE:\n").append(assistantRole.strip()).append("\n\n");

        sb.append("TOOLS:\n");
        if (toolSummaries == null || toolSummaries.isEmpty()) {
            sb.append("(none)\n");
        } else {
            for (String t : toolSummaries) {
                sb.append("- ").append(t).append('\n');
            }
        }
        sb.append('\n');

        sb.append("RECENT CONVERSATION:\n");
        List<Message> tail = tail(recentHistory);
        if (tail.isEmpty()) {
            sb.append("(none)\n");
        } else {
            for (Message m : tail) {
                String role = m.getMessageType() == MessageType.USER ? "User"
                        : m.getMessageType() == MessageType.ASSISTANT ? "Assistant" : null;
                if (role == null || m.getText() == null || m.getText().isBlank()) {
                    continue;
                }
                sb.append(role).append(": ").append(m.getText().strip()).append('\n');
            }
        }
        sb.append('\n');

        sb.append("MESSAGE:\n").append(userMessage.strip());
        return sb.toString();
    }

    private List<Message> tail(List<Message> history) {
        if (history == null || history.isEmpty()) {
            return List.of();
        }
        int from = Math.max(0, history.size() - HISTORY_TAIL);
        return history.subList(from, history.size());
    }
}
