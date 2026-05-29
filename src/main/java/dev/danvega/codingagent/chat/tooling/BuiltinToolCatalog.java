package dev.danvega.codingagent.chat.tooling;

import dev.danvega.codingagent.assistant.dto.response.BuiltinToolDto;
import org.springaicommunity.agent.tools.FileSystemTools;
import org.springaicommunity.agent.tools.GlobTool;
import org.springaicommunity.agent.tools.GrepTool;
import org.springaicommunity.agent.tools.ShellTools;
import org.springframework.ai.support.ToolCallbacks;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Catalog of code-defined ("built-in") tools, keyed by a stable string so assistants
 * can enable a subset. Each entry resolves to one or more Spring AI {@link ToolCallback}s.
 */
@Component
public class BuiltinToolCatalog {

    private record Entry(String label, Object toolObject) {}

    private final Map<String, Entry> entries = new LinkedHashMap<>();

    public BuiltinToolCatalog() {
        entries.put("file_system", new Entry("File system (read/write/edit files)", FileSystemTools.builder().build()));
        entries.put("grep", new Entry("Grep (search file contents)", GrepTool.builder().build()));
        entries.put("glob", new Entry("Glob (match files by pattern)", GlobTool.builder().build()));
        entries.put("shell", new Entry("Shell (run commands)", ShellTools.builder().build()));
    }

    public List<BuiltinToolDto> catalog() {
        List<BuiltinToolDto> list = new ArrayList<>();
        entries.forEach((key, entry) -> list.add(new BuiltinToolDto(key, entry.label())));
        return list;
    }

    public List<String> keys() {
        return new ArrayList<>(entries.keySet());
    }

    public List<ToolCallback> callbacksFor(Collection<String> keys) {
        List<ToolCallback> callbacks = new ArrayList<>();
        if (keys == null) {
            return callbacks;
        }
        for (String key : keys) {
            Entry entry = entries.get(key);
            if (entry != null) {
                callbacks.addAll(List.of(ToolCallbacks.from(entry.toolObject())));
            }
        }
        return callbacks;
    }
}
