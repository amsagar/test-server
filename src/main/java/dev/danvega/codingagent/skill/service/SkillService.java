package dev.danvega.codingagent.skill.service;

import dev.danvega.codingagent.skill.dto.request.UpdateSkillRequest;
import dev.danvega.codingagent.skill.dto.response.SkillDto;
import dev.danvega.codingagent.skill.entity.AgentSkill;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface SkillService {

    List<SkillDto> list(String assistantId);

    SkillDto get(String id);

    SkillDto create(String assistantId, MultipartFile file);

    SkillDto update(String id, UpdateSkillRequest request, MultipartFile file);

    void delete(String id);

    /** Enabled skills for an assistant, used to materialize a runtime workspace. */
    List<AgentSkill> forAssistant(String assistantId);
}
