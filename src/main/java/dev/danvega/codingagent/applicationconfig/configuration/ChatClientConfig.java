package dev.danvega.codingagent.applicationconfig.configuration;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.memory.MessageWindowChatMemory;
import org.springframework.ai.chat.memory.repository.jdbc.JdbcChatMemoryRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;

@Configuration
public class ChatClientConfig {

    @Bean
    public ChatMemory chatMemory(JdbcChatMemoryRepository chatMemoryRepository) {
        return MessageWindowChatMemory.builder()
                .chatMemoryRepository(chatMemoryRepository)
                .maxMessages(50)
                .build();
    }

    /**
     * Bare chat client: only the conversation-memory advisor is baked in. The system
     * prompt and tool set are supplied per request from the selected assistant.
     */
    @Bean
    public ChatClient chatClient(ChatClient.Builder builder, ChatMemory chatMemory) {
        return builder
                .defaultAdvisors(MessageChatMemoryAdvisor.builder(chatMemory).build())
                .build();
    }

    @Bean
    @Qualifier("titleChatClient")
    public ChatClient titleChatClient(ChatClient.Builder builder,
                                      @Value("classpath:prompts/title-generator-system.md") Resource titlePrompt) {
        return builder
                .defaultSystem(titlePrompt)
                .build();
    }

    /**
     * Stateless classifier used by the scope guard to decide whether a user message is in scope for
     * the selected assistant. No memory advisor — each classification is independent.
     */
    @Bean
    @Qualifier("scopeGuardChatClient")
    public ChatClient scopeGuardChatClient(ChatClient.Builder builder,
                                           @Value("classpath:prompts/scope-guard-system.md") Resource scopeGuardPrompt) {
        return builder
                .defaultSystem(scopeGuardPrompt)
                .build();
    }
}
