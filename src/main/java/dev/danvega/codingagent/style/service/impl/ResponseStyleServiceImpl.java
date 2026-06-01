package dev.danvega.codingagent.style.service.impl;

import dev.danvega.codingagent.applicationconfig.exceptions.ResourceNotFoundException;
import dev.danvega.codingagent.style.dto.request.CreateStyleRequest;
import dev.danvega.codingagent.style.dto.request.UpdateStyleRequest;
import dev.danvega.codingagent.style.dto.response.ResponseStyleDto;
import dev.danvega.codingagent.style.entity.ResponseStyle;
import dev.danvega.codingagent.style.repo.ResponseStyleRepository;
import dev.danvega.codingagent.style.service.ResponseStyleService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
@Slf4j
public class ResponseStyleServiceImpl implements ResponseStyleService {

    private final ResponseStyleRepository repository;

    public ResponseStyleServiceImpl(ResponseStyleRepository repository) {
        this.repository = repository;
    }

    @Override
    public List<ResponseStyleDto> list(String assistantId) {
        return repository.findByAssistant(assistantId).stream().map(this::toDto).toList();
    }

    @Override
    public ResponseStyleDto get(String id) {
        return toDto(requireEntity(id));
    }

    @Override
    public ResponseStyleDto create(String assistantId, CreateStyleRequest request) {
        long now = Instant.now().getEpochSecond();
        ResponseStyle s = new ResponseStyle();
        s.setAssistantId(assistantId);
        s.setName(required(request.getName(), "name"));
        s.setDescription(request.getDescription());
        s.setInstructions(required(request.getInstructions(), "instructions"));
        String id = repository.create(s, now);
        log.info("Created response style {} ({})", id, s.getName());
        return get(id);
    }

    @Override
    public ResponseStyleDto update(String id, UpdateStyleRequest request) {
        ResponseStyle existing = requireEntity(id);
        long now = Instant.now().getEpochSecond();
        if (request.getName() != null && !request.getName().isBlank()) {
            existing.setName(request.getName().trim());
        }
        if (request.getDescription() != null) {
            existing.setDescription(request.getDescription());
        }
        if (request.getInstructions() != null && !request.getInstructions().isBlank()) {
            existing.setInstructions(request.getInstructions());
        }
        repository.update(existing, now);
        return get(id);
    }

    @Override
    public void delete(String id) {
        requireEntity(id);
        repository.delete(id);
        log.info("Deleted response style {}", id);
    }

    @Override
    public ResponseStyle requireEntity(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Response style not found: " + id));
    }

    @Override
    public String instructionsFor(String styleId) {
        if (styleId == null || styleId.isBlank()) {
            return null;
        }
        return repository.findById(styleId)
                .map(ResponseStyle::getInstructions)
                .filter(i -> i != null && !i.isBlank())
                .orElse(null);
    }

    private ResponseStyleDto toDto(ResponseStyle s) {
        return ResponseStyleDto.builder()
                .id(s.getId())
                .name(s.getName())
                .description(s.getDescription())
                .instructions(s.getInstructions())
                .createdAt(s.getCreatedAt())
                .updatedAt(s.getUpdatedAt())
                .build();
    }

    private static String required(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Response style " + field + " is required");
        }
        return value.trim();
    }
}
