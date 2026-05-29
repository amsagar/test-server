package dev.danvega.codingagent.chat.tooling;

public interface ToolEventSink {

    void toolCall(String id, String name, String input);

    void toolResult(String id, String output, boolean error);
}
