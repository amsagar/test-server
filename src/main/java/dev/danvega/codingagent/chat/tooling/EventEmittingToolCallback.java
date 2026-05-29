package dev.danvega.codingagent.chat.tooling;

import org.springframework.ai.chat.model.ToolContext;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.definition.ToolDefinition;
import org.springframework.ai.tool.metadata.ToolMetadata;

import java.util.UUID;

/**
 * Wraps a delegate {@link ToolCallback} and publishes a tool-call event (name + input)
 * before execution and a tool-result event (output) after, to the {@link ToolEventSink}
 * registered for the current request (resolved from {@link ToolContext}).
 */
public class EventEmittingToolCallback implements ToolCallback {

    private final ToolCallback delegate;
    private final ToolEventRegistry registry;

    public EventEmittingToolCallback(ToolCallback delegate, ToolEventRegistry registry) {
        this.delegate = delegate;
        this.registry = registry;
    }

    @Override
    public ToolDefinition getToolDefinition() {
        return delegate.getToolDefinition();
    }

    @Override
    public ToolMetadata getToolMetadata() {
        return delegate.getToolMetadata();
    }

    @Override
    public String call(String toolInput) {
        return delegate.call(toolInput);
    }

    @Override
    public String call(String toolInput, ToolContext toolContext) {
        ToolEventSink sink = resolveSink(toolContext);
        String callId = UUID.randomUUID().toString();
        String name = delegate.getToolDefinition().name();
        if (sink != null) {
            sink.toolCall(callId, name, toolInput);
        }
        try {
            String output = delegate.call(toolInput, toolContext);
            if (sink != null) {
                sink.toolResult(callId, output, false);
            }
            return output;
        } catch (RuntimeException e) {
            if (sink != null) {
                sink.toolResult(callId, String.valueOf(e.getMessage()), true);
            }
            throw e;
        }
    }

    private ToolEventSink resolveSink(ToolContext toolContext) {
        if (toolContext == null) {
            return null;
        }
        Object requestId = toolContext.getContext().get(ToolEventRegistry.REQUEST_ID);
        if (requestId == null) {
            return null;
        }
        return registry.get(requestId.toString()).orElse(null);
    }
}
