package dev.danvega.codingagent.applicationconfig.configuration;

import dev.danvega.codingagent.chat.tooling.EventEmittingToolCallback;
import dev.danvega.codingagent.chat.tooling.ToolEventRegistry;
import org.springaicommunity.agent.tools.FileSystemTools;
import org.springaicommunity.agent.tools.GlobTool;
import org.springaicommunity.agent.tools.GrepTool;
import org.springaicommunity.agent.tools.ShellTools;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.memory.MessageWindowChatMemory;
import org.springframework.ai.chat.memory.repository.jdbc.JdbcChatMemoryRepository;
import org.springframework.ai.support.ToolCallbacks;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;

import java.util.Arrays;
import java.util.List;

@Configuration
public class ChatClientConfig {

    @Bean
    public ChatMemory chatMemory(JdbcChatMemoryRepository chatMemoryRepository) {
        return MessageWindowChatMemory.builder()
                .chatMemoryRepository(chatMemoryRepository)
                .maxMessages(50)
                .build();
    }

    @Bean
    public ChatClient chatClient(ChatClient.Builder builder,
                                 ChatMemory chatMemory,
                                 ToolEventRegistry toolEventRegistry,
                                 @Value("classpath:prompts/coding-assistant-system.md") Resource systemPrompt,
                                 @Value("${agent.working-dir}") String workingDir) {
        ToolCallback[] rawCallbacks = ToolCallbacks.from(
                FileSystemTools.builder().build(),
                GrepTool.builder().build(),
                GlobTool.builder().build(),
                ShellTools.builder().build()
        );
        List<ToolCallback> instrumentedCallbacks = Arrays.stream(rawCallbacks)
                .map(callback -> (ToolCallback) new EventEmittingToolCallback(callback, toolEventRegistry))
                .toList();

        return builder
                .defaultSystem(spec -> spec.text(systemPrompt).param("working_dir", workingDir))
                .defaultToolCallbacks(instrumentedCallbacks)
                .defaultAdvisors(
                        MessageChatMemoryAdvisor.builder(chatMemory).build()
                )
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
}
