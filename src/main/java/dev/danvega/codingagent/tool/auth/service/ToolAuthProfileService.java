package dev.danvega.codingagent.tool.auth.service;

import dev.danvega.codingagent.tool.auth.dto.request.CreateAuthProfileRequest;
import dev.danvega.codingagent.tool.auth.dto.request.UpdateAuthProfileRequest;
import dev.danvega.codingagent.tool.auth.dto.response.ToolAuthProfileDto;
import dev.danvega.codingagent.tool.auth.entity.ToolAuthProfile;

import java.util.List;

public interface ToolAuthProfileService {

    List<ToolAuthProfileDto> list();

    ToolAuthProfileDto get(String id);

    ToolAuthProfileDto create(CreateAuthProfileRequest request);

    ToolAuthProfileDto update(String id, UpdateAuthProfileRequest request);

    void delete(String id);

    ToolAuthProfile requireEntity(String id);
}
