package dev.danvega.codingagent.tool.imports;

import dev.danvega.codingagent.tool.imports.dto.ImportRequest;
import dev.danvega.codingagent.tool.imports.dto.ImportResult;

public interface ToolImportService {

    ImportResult importByKind(String kind, ImportRequest request);
}
