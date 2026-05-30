package dev.danvega.codingagent.style.service;

import dev.danvega.codingagent.style.dto.request.CreateStyleRequest;
import dev.danvega.codingagent.style.dto.request.UpdateStyleRequest;
import dev.danvega.codingagent.style.dto.response.ResponseStyleDto;
import dev.danvega.codingagent.style.entity.ResponseStyle;

import java.util.List;

public interface ResponseStyleService {

    List<ResponseStyleDto> list();

    ResponseStyleDto get(String id);

    ResponseStyleDto create(CreateStyleRequest request);

    ResponseStyleDto update(String id, UpdateStyleRequest request);

    void delete(String id);

    ResponseStyle requireEntity(String id);

    /** Resolve a style's instructions by id, or {@code null} if the id is blank or unknown. */
    String instructionsFor(String styleId);
}
