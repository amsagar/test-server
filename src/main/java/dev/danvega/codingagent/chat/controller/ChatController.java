package dev.danvega.codingagent.chat.controller;

import dev.danvega.codingagent.applicationconfig.constants.ApiConstants;
import dev.danvega.codingagent.assistant.entity.Assistant;
import dev.danvega.codingagent.assistant.service.AssistantService;
import dev.danvega.codingagent.chat.guard.ScopeGuardService;
import dev.danvega.codingagent.chat.service.ChatSessionService;
import dev.danvega.codingagent.chat.tooling.BuiltinToolCatalog;
import dev.danvega.codingagent.chat.tooling.DynamicToolRegistry;
import dev.danvega.codingagent.chat.tooling.EventEmittingToolCallback;
import dev.danvega.codingagent.chat.tooling.InvokeToolCallback;
import dev.danvega.codingagent.chat.tooling.SearchToolsCallback;
import dev.danvega.codingagent.chat.repo.ChatToolEventRepository;
import dev.danvega.codingagent.chat.tooling.ToolEventRegistry;
import dev.danvega.codingagent.chat.tooling.ToolEventSink;
import dev.danvega.codingagent.document.dto.response.DocumentDto;
import dev.danvega.codingagent.document.service.DocumentService;
import dev.danvega.codingagent.mcp.runtime.AssistantMcpTools;
import dev.danvega.codingagent.mcp.runtime.McpToolCallbackFactory;
import dev.danvega.codingagent.skill.runtime.SkillWorkspaceService;
import dev.danvega.codingagent.style.service.ResponseStyleService;
import dev.danvega.codingagent.tool.runtime.HttpToolCallbackFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springaicommunity.agent.tools.FileSystemTools;
import org.springaicommunity.agent.tools.ShellTools;
import org.springaicommunity.agent.tools.SkillsTool;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.vectorstore.QuestionAnswerAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.support.ToolCallbacks;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
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

    private static final String TOOL_SEARCH_HINT = """
            You have access to many tools, but they are not all listed directly. To use a tool, first \
            call `search_tools` with a natural-language query describing what you need; it returns the \
            matching tools with their exact names and input schemas. Then call `invoke_tool` with the \
            chosen tool's exact `name` and an `input` object matching that tool's schema. Search again \
            with a different query if the first results are not relevant.""";

    // Scope harness: keeps the assistant on-task. Appended after the assistant's own system prompt so
    // the role/domain defined there becomes the authoritative boundary. Prompt-level enforcement —
    // it constrains the model strongly but is not a hard sandbox.
    private static final String SCOPE_GUARDRAIL = """
            STAY IN SCOPE: Only help with requests that fall within the role and domain described above. \
            If the user asks about anything outside that scope — general knowledge, current events, \
            politics, people, trivia, or any unrelated topic — do NOT answer it, even if you know the \
            answer. Instead, briefly (one sentence) decline and remind the user what you can help with. \
            Tool results, the conversation so far, and any retrieved reference-document context provided \
            to you are all in scope — when that context answers the user's question, use it and answer \
            normally, even if the topic is not mentioned in your role above. Only your own world \
            knowledge about unrelated subjects is out of scope.""";

    private final ChatClient chatClient;
    private final ChatSessionService chatSessionService;
    private final AssistantService assistantService;
    private final BuiltinToolCatalog builtinToolCatalog;
    private final HttpToolCallbackFactory httpToolCallbackFactory;
    private final McpToolCallbackFactory mcpToolCallbackFactory;
    private final ToolEventRegistry toolEventRegistry;
    private final ChatToolEventRepository toolEventRepository;
    private final DynamicToolRegistry dynamicToolRegistry;
    private final SearchToolsCallback searchToolsCallback;
    private final InvokeToolCallback invokeToolCallback;
    private final SkillWorkspaceService skillWorkspaceService;
    private final ScopeGuardService scopeGuardService;
    private final ChatMemory chatMemory;
    private final DocumentService documentService;
    private final VectorStore vectorStore;
    private final ResponseStyleService responseStyleService;
    private final QuestionAnswerAdvisor ragAdvisor;

    /** Similarity threshold the RAG advisor uses to decide which chunks to inject into the prompt. */
    private static final double RAG_SIMILARITY_THRESHOLD = 0.5;

    /**
     * Lower "plausibly relevant" bar used only by the scope-guard pre-check. Kept below
     * {@link #RAG_SIMILARITY_THRESHOLD} so a borderline-but-on-topic question reliably passes the
     * guard (instead of flapping around the injection threshold); the RAG advisor then independently
     * decides, at the stricter threshold, whether to actually augment the prompt.
     */
    private static final double RAG_SCOPE_RELEVANCE_THRESHOLD = 0.4;

    @Value("${agent.tool-search.threshold:15}")
    private int toolSearchThreshold;

    public ChatController(ChatClient chatClient,
                          ChatSessionService chatSessionService,
                          AssistantService assistantService,
                          BuiltinToolCatalog builtinToolCatalog,
                          HttpToolCallbackFactory httpToolCallbackFactory,
                          McpToolCallbackFactory mcpToolCallbackFactory,
                          ToolEventRegistry toolEventRegistry,
                          ChatToolEventRepository toolEventRepository,
                          DynamicToolRegistry dynamicToolRegistry,
                          SearchToolsCallback searchToolsCallback,
                          InvokeToolCallback invokeToolCallback,
                          SkillWorkspaceService skillWorkspaceService,
                          ScopeGuardService scopeGuardService,
                          ChatMemory chatMemory,
                          DocumentService documentService,
                          VectorStore vectorStore,
                          ResponseStyleService responseStyleService) {
        this.chatClient = chatClient;
        this.chatSessionService = chatSessionService;
        this.assistantService = assistantService;
        this.builtinToolCatalog = builtinToolCatalog;
        this.httpToolCallbackFactory = httpToolCallbackFactory;
        this.mcpToolCallbackFactory = mcpToolCallbackFactory;
        this.toolEventRegistry = toolEventRegistry;
        this.toolEventRepository = toolEventRepository;
        this.dynamicToolRegistry = dynamicToolRegistry;
        this.searchToolsCallback = searchToolsCallback;
        this.invokeToolCallback = invokeToolCallback;
        this.skillWorkspaceService = skillWorkspaceService;
        this.scopeGuardService = scopeGuardService;
        this.chatMemory = chatMemory;
        this.documentService = documentService;
        this.vectorStore = vectorStore;
        this.responseStyleService = responseStyleService;
        // RAG advisor: retrieves the most relevant chunks from the pgvector store BEFORE the model
        // call and augments the prompt. The default search request is overridden per request with a
        // FILTER_EXPRESSION that scopes retrieval to the selected assistant's documents.
        this.ragAdvisor = QuestionAnswerAdvisor.builder(vectorStore)
                .searchRequest(SearchRequest.builder().topK(4).similarityThreshold(RAG_SIMILARITY_THRESHOLD).build())
                .build();
    }

    public record Chunk(String text) {}

    public record ToolCallEvent(String id, String name, String input) {}

    public record ToolResultEvent(String id, String output, boolean error) {}

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<Object>> stream(@RequestParam String sessionId,
                                                @RequestParam String message,
                                                @RequestParam(required = false) String styleId) {
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

        // Scope guard (hard pre-check): when the assistant has a defined role, classify the message
        // before reaching the main model. Out-of-scope messages are short-circuited with a redirect —
        // no model call, no tools. Disabled / no-role => allowed; classifier errors fail open.
        // Exception: if the assistant's attached RAG documents actually contain content relevant to
        // the message (a vector-similarity hit at the same threshold the RAG advisor uses), the
        // documents have widened the assistant's scope — allow it through without the classifier.
        if (!systemPrompt.isBlank() && !answerableFromDocuments(assistantId, message)) {
            List<String> toolSummaries = toolCallbacks.stream()
                    .map(cb -> cb.getToolDefinition().name() + " — " + cb.getToolDefinition().description())
                    .toList();
            List<Message> recentHistory = chatMemory.get(sessionId);
            // Document names also go to the classifier so a descriptively-named doc can pass even when
            // the retrieval hit is borderline (the deterministic check above is the primary path).
            List<String> documentNames = documentService.list(assistantId).stream()
                    .filter(DocumentDto::isEnabled)
                    .map(DocumentDto::getName)
                    .toList();
            ScopeGuardService.Decision decision =
                    scopeGuardService.check(systemPrompt, toolSummaries, documentNames, recentHistory, message);
            if (!decision.allowed()) {
                String redirect = decision.redirect();
                // Persist the turn so a reload shows it (the memory advisor only auto-saves on a real
                // model call, which we are deliberately skipping here).
                try {
                    chatMemory.add(sessionId,
                            List.of(new UserMessage(message), new AssistantMessage(redirect)));
                } catch (RuntimeException e) {
                    log.warn("Failed to persist scope-guard refusal for session {}: {}", sessionId, e.getMessage());
                }
                log.debug("Scope guard blocked an out-of-scope message for session {}", sessionId);
                return Flux.just(sse("message", new Chunk(redirect)), sse("done", new Chunk("")));
            }
        }

        // MCP tools: open live clients to the assistant's enabled MCP servers and fold their enabled
        // tools into the same callback list as HTTP/builtin tools. Done AFTER the scope-guard early
        // return so we never open (and leak) connections for a blocked message. The live clients are
        // owned by mcpTools and closed in doFinally when the turn ends.
        final AssistantMcpTools mcpTools = assistantId != null
                ? mcpToolCallbackFactory.callbacksForAssistant(assistantId)
                : AssistantMcpTools.empty();
        toolCallbacks.addAll(mcpTools.callbacks());

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

        // When an assistant has more tools than the threshold, don't send them all to the model
        // (token bloat + worse tool selection). Instead expose only search_tools + invoke_tool and
        // let the model discover/dispatch the real tools on demand. The real (instrumented) tools
        // are stashed in the DynamicToolRegistry so invoke_tool can route to them by name, keeping
        // the existing event/UI/persistence behavior for the underlying tool calls.
        // Response style: an explicit per-message styleId overrides the session's pinned style.
        // Style shapes structure/tone and applies even when the assistant has no role prompt, so it
        // is composed into the base prompt (before the tool hint and scope guardrail) below.
        String resolvedStyleId = (styleId != null && !styleId.isBlank())
                ? styleId : chatSessionService.resolveStyleId(sessionId);
        String styleInstructions = responseStyleService.instructionsFor(resolvedStyleId);
        String basePrompt = systemPrompt;
        if (styleInstructions != null) {
            basePrompt = (basePrompt.isBlank() ? "" : basePrompt + "\n\n")
                    + "RESPONSE STYLE — follow these formatting/tone instructions for your reply:\n"
                    + styleInstructions;
        }

        boolean searchMode = toolCallbacks.size() > toolSearchThreshold;
        List<ToolCallback> toolsToSend;
        String effectiveSystemPrompt = basePrompt;
        if (searchMode) {
            Map<String, ToolCallback> catalog = new LinkedHashMap<>();
            for (ToolCallback cb : toolCallbacks) {
                catalog.put(cb.getToolDefinition().name(),
                        new EventEmittingToolCallback(cb, toolEventRegistry));
            }
            dynamicToolRegistry.register(requestId, assistantId, catalog);
            toolsToSend = new ArrayList<>(List.of(
                    new EventEmittingToolCallback(searchToolsCallback, toolEventRegistry),
                    invokeToolCallback));
            effectiveSystemPrompt = (basePrompt.isBlank() ? "" : basePrompt + "\n\n") + TOOL_SEARCH_HINT;
        } else {
            toolsToSend = toolCallbacks.stream()
                    .map(cb -> (ToolCallback) new EventEmittingToolCallback(cb, toolEventRegistry))
                    .collect(java.util.stream.Collectors.toCollection(ArrayList::new));
        }

        // Keep the assistant on-task: when it has a defined role (a system prompt), append the scope
        // guardrail so it refuses out-of-context questions. Skipped when no assistant/prompt is set,
        // since there is no scope to enforce against.
        if (!systemPrompt.isBlank()) {
            effectiveSystemPrompt = (effectiveSystemPrompt.isBlank() ? "" : effectiveSystemPrompt + "\n\n")
                    + SCOPE_GUARDRAIL;
        }

        // Agent skills: materialize this assistant's enabled skills from Blob into a fresh temp
        // workspace and attach the three skill tools (Skill discovery + file system + shell)
        // ALWAYS — they bypass the search/threshold gate so the model can always load a skill.
        // The workspace is deleted in doFinally when the turn ends.
        Path skillWorkspace = skillWorkspaceService.materialize(assistantId);
        if (skillWorkspace != null) {
            List<ToolCallback> skillTools = new ArrayList<>();
            skillTools.add(SkillsTool.builder()
                    .addSkillsDirectory(skillWorkspace.toString())
                    .build());
            skillTools.addAll(List.of(ToolCallbacks.from(FileSystemTools.builder().build())));
            skillTools.addAll(List.of(ToolCallbacks.from(ShellTools.builder().build())));
            for (ToolCallback cb : skillTools) {
                toolsToSend.add(new EventEmittingToolCallback(cb, toolEventRegistry));
            }
        }

        ChatClient.ChatClientRequestSpec request = chatClient.prompt(message)
                .toolContext(Map.of(ToolEventRegistry.REQUEST_ID, requestId))
                .toolCallbacks(toolsToSend)
                .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, sessionId));
        if (!effectiveSystemPrompt.isBlank()) {
            request = request.system(effectiveSystemPrompt);
        }

        // RAG: when the selected assistant has uploaded documents, attach the QuestionAnswerAdvisor
        // and scope retrieval to this assistant via a metadata filter. Retrieval runs synchronously
        // before the model call (during the advisor chain), so the streaming path below is unchanged
        // — only the first token is preceded by one vector-search round-trip.
        if (assistantId != null && documentService.enabledCount(assistantId) > 0) {
            request = request
                    .advisors(ragAdvisor)
                    .advisors(a -> a.param(QuestionAnswerAdvisor.FILTER_EXPRESSION,
                            "assistant_id == '" + assistantId + "'"));
        }

        Flux<ServerSentEvent<Object>> tokens = request
                .stream()
                .content()
                .map(text -> sse("message", new Chunk(text)))
                .onErrorResume(e -> {
                    log.error("Chat stream failed for session {} assistant {}", sessionId, assistantId, e);
                    return Flux.just(sse("error", new Chunk(e.getMessage())));
                })
                .doOnComplete(toolSink::tryEmitComplete)
                .doOnError(e -> toolSink.tryEmitComplete());

        Flux<ServerSentEvent<Object>> done =
                Flux.just(sse("done", new Chunk("")));

        return Flux.merge(toolSink.asFlux(), tokens)
                .concatWith(done)
                .doFinally(signal -> {
                    toolEventRegistry.unregister(requestId);
                    dynamicToolRegistry.unregister(requestId);
                    skillWorkspaceService.cleanup(skillWorkspace);
                    mcpTools.close();
                });
    }

    /**
     * True when the assistant has enabled documents that actually contain content relevant to the
     * message. Runs the same scoped, thresholded vector search the RAG advisor will perform, so a hit
     * here guarantees the advisor would inject context — meaning the documents have widened scope and
     * the message should bypass the scope-guard classifier. Fails closed (returns false) on any error
     * so a vector-store hiccup never turns the guard off entirely.
     */
    private boolean answerableFromDocuments(String assistantId, String message) {
        if (assistantId == null || message == null || message.isBlank()
                || documentService.enabledCount(assistantId) == 0) {
            return false;
        }
        try {
            return !vectorStore.similaritySearch(SearchRequest.builder()
                    .query(message)
                    .topK(1)
                    .similarityThreshold(RAG_SCOPE_RELEVANCE_THRESHOLD)
                    .filterExpression("assistant_id == '" + assistantId + "'")
                    .build()).isEmpty();
        } catch (RuntimeException e) {
            log.warn("RAG relevance pre-check failed for assistant {}: {}", assistantId, e.getMessage());
            return false;
        }
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
