package dev.danvega.codingagent.assistant.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BuiltinToolDto {
    private String key;
    private String label;
}
