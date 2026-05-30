package dev.danvega.codingagent.skill.dto.request;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UpdateSkillRequest {
    private String name;
    private String description;
    private Boolean enabled;
}
