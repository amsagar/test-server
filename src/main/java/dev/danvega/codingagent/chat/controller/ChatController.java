package dev.danvega.codingagent.chat.controller;

import dev.danvega.codingagent.applicationconfig.constants.ApiConstants;
import dev.danvega.codingagent.assistant.entity.Assistant;
import dev.danvega.codingagent.assistant.service.AssistantService;
import dev.danvega.codingagent.chat.service.ChatSessionService;
import dev.danvega.codingagent.chat.tooling.BuiltinToolCatalog;
import dev.danvega.codingagent.chat.tooling.EventEmittingToolCallback;
import dev.danvega.codingagent.chat.tooling.ToolEventRegistry;
import dev.danvega.codingagent.chat.tooling.ToolEventSink;
import dev.danvega.codingagent.tool.runtime.HttpToolCallbackFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping(ApiConstants.CHAT_PATH)
@CrossOrigin(origins = "*")
public class ChatController {

    private static final int MAX_OUTPUT_CHARS = 6000;

    private final ChatClient chatClient;
    private final ChatSessionService chatSessionService;
    private final AssistantService assistantService;
    private final BuiltinToolCatalog builtinToolCatalog;
    private final HttpToolCallbackFactory httpToolCallbackFactory;
    private final ToolEventRegistry toolEventRegistry;

    public ChatController(ChatClient chatClient,
                          ChatSessionService chatSessionService,
                          AssistantService assistantService,
                          BuiltinToolCatalog builtinToolCatalog,
                          HttpToolCallbackFactory httpToolCallbackFactory,
                          ToolEventRegistry toolEventRegistry) {
        this.chatClient = chatClient;
        this.chatSessionService = chatSessionService;
        this.assistantService = assistantService;
        this.builtinToolCatalog = builtinToolCatalog;
        this.httpToolCallbackFactory = httpToolCallbackFactory;
        this.toolEventRegistry = toolEventRegistry;
    }

    public record Chunk(String text) {}

    public record ToolCallEvent(String id, String name, String input) {}

    public record ToolResultEvent(String id, String output, boolean error) {}

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<Object>> stream(@RequestParam String sessionId,
                                                @RequestParam String message) {
        chatSessionService.touchAndMaybeTitle(sessionId, message);

        String assistantId = chatSessionService.resolveAssistantId(sessionId);
        String systemPrompt = "";
        List<ToolCallback> toolCallbacks = new ArrayList<>();
        if (assistantId != null) {
            Assistant assistant = assistantService.requireEntity(assistantId);
            systemPrompt = assistant.getSystemPrompt() == null ? ""
                    : assistant.getSystemPrompt();
            toolCallbacks.addAll(builtinToolCatalog.callbacksFor(
                    assistantService.builtinToolKeys(assistant)));
            toolCallbacks.addAll(httpToolCallbackFactory.callbacksForAssistant(assistantId));
        }

        String requestId = UUID.randomUUID().toString();
        Sinks.Many<ServerSentEvent<Object>> toolSink = Sinks.many().multicast().onBackpressureBuffer();
        Sinks.EmitFailureHandler emitHandler =
                Sinks.EmitFailureHandler.busyLooping(Duration.ofMillis(50));

        toolEventRegistry.register(requestId, new ToolEventSink() {
            @Override
            public void toolCall(String id, String name, String input) {
                toolSink.emitNext(sse("tool", new ToolCallEvent(id, name, input)), emitHandler);
            }

            @Override
            public void toolResult(String id, String output, boolean error) {
                toolSink.emitNext(sse("tool_result", new ToolResultEvent(id, truncate(output), error)), emitHandler);
            }
        });

        List<ToolCallback> instrumented = toolCallbacks.stream()
                .map(cb -> (ToolCallback) new EventEmittingToolCallback(cb, toolEventRegistry))
                .toList();

        ChatClient.ChatClientRequestSpec request = chatClient.prompt(message)
                .toolContext(Map.of(ToolEventRegistry.REQUEST_ID, requestId))
                .toolCallbacks(instrumented)
                .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, sessionId));
        if (!systemPrompt.isBlank()) {
            request = request.system(systemPrompt);
        }

        Flux<ServerSentEvent<Object>> tokens = request
                .stream()
                .content()
                .map(text -> sse("message", new Chunk(text)))
                .onErrorResume(e -> Flux.just(sse("error", new Chunk(e.getMessage()))))
                .doOnComplete(toolSink::tryEmitComplete)
                .doOnError(e -> toolSink.tryEmitComplete());

        Flux<ServerSentEvent<Object>> done =
                Flux.just(sse("done", new Chunk("")));

        return Flux.merge(toolSink.asFlux(), tokens)
                .concatWith(done)
                .doFinally(signal -> toolEventRegistry.unregister(requestId));
    }

    private static ServerSentEvent<Object> sse(String event, Object data) {
        return ServerSentEvent.builder(data).event(event).build();
    }

    private static String truncate(String text) {
        if (text == null) {
            return "";
        }
        if (text.length() <= MAX_OUTPUT_CHARS) {
            return text;
        }
        return text.substring(0, MAX_OUTPUT_CHARS) + "\n… (truncated)";
    }
}
