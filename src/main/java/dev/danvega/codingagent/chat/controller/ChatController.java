package dev.danvega.codingagent.chat.controller;

import dev.danvega.codingagent.applicationconfig.constants.ApiConstants;
import dev.danvega.codingagent.assistant.entity.Assistant;
import dev.danvega.codingagent.assistant.service.AssistantService;
import dev.danvega.codingagent.chat.service.ChatSessionService;
import dev.danvega.codingagent.chat.tooling.BuiltinToolCatalog;
import dev.danvega.codingagent.chat.tooling.EventEmittingToolCallback;
import dev.danvega.codingagent.chat.repo.ChatToolEventRepository;
import dev.danvega.codingagent.chat.tooling.ToolEventRegistry;
import dev.danvega.codingagent.chat.tooling.ToolEventSink;
import dev.danvega.codingagent.tool.runtime.HttpToolCallbackFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@RestController
@RequestMapping(ApiConstants.CHAT_PATH)
@CrossOrigin(origins = "*")
public class ChatController {

    private static final Logger log = LoggerFactory.getLogger(ChatController.class);

    private static final int MAX_OUTPUT_CHARS = 6000;

    private final ChatClient chatClient;
    private final ChatSessionService chatSessionService;
    private final AssistantService assistantService;
    private final BuiltinToolCatalog builtinToolCatalog;
    private final HttpToolCallbackFactory httpToolCallbackFactory;
    private final ToolEventRegistry toolEventRegistry;
    private final ChatToolEventRepository toolEventRepository;

    public ChatController(ChatClient chatClient,
                          ChatSessionService chatSessionService,
                          AssistantService assistantService,
                          BuiltinToolCatalog builtinToolCatalog,
                          HttpToolCallbackFactory httpToolCallbackFactory,
                          ToolEventRegistry toolEventRegistry,
                          ChatToolEventRepository toolEventRepository) {
        this.chatClient = chatClient;
        this.chatSessionService = chatSessionService;
        this.assistantService = assistantService;
        this.builtinToolCatalog = builtinToolCatalog;
        this.httpToolCallbackFactory = httpToolCallbackFactory;
        this.toolEventRegistry = toolEventRegistry;
        this.toolEventRepository = toolEventRepository;
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

        // Tool events are persisted to chat_tool_event so they survive reload (Spring AI chat
        // memory stores only message text, not tool call/result data). Tag each event with the
        // assistant-turn index this exchange will occupy so it re-attaches to the right bubble.
        int turnIndex = (int) chatSessionService.assistantMessageCount(sessionId);
        AtomicInteger seq = new AtomicInteger(0);
        Map<String, String[]> pendingCalls = new ConcurrentHashMap<>();

        toolEventRegistry.register(requestId, new ToolEventSink() {
            @Override
            public void toolCall(String id, String name, String input) {
                pendingCalls.put(id, new String[] { name, input });
                toolSink.emitNext(sse("tool", new ToolCallEvent(id, name, input)), emitHandler);
            }

            @Override
            public void toolResult(String id, String output, boolean error) {
                toolSink.emitNext(sse("tool_result", new ToolResultEvent(id, truncate(output), error)), emitHandler);
                String[] call = pendingCalls.remove(id);
                String name = call != null ? call[0] : "";
                String input = call != null ? call[1] : null;
                try {
                    toolEventRepository.save(sessionId, turnIndex, seq.getAndIncrement(),
                            id, name, input, output, error, Instant.now().getEpochSecond());
                } catch (RuntimeException e) {
                    log.warn("Failed to persist tool event for session {}: {}", sessionId, e.getMessage());
                }
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
