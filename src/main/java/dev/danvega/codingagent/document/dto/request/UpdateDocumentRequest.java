package dev.danvega.codingagent.document.dto.request;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UpdateDocumentRequest {
    private String name;
    private Boolean enabled;
}
