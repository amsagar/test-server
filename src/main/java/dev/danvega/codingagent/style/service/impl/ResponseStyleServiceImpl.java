package dev.danvega.codingagent.style.service.impl;

import dev.danvega.codingagent.applicationconfig.exceptions.ResourceNotFoundException;
import dev.danvega.codingagent.style.dto.request.CreateStyleRequest;
import dev.danvega.codingagent.style.dto.request.UpdateStyleRequest;
import dev.danvega.codingagent.style.dto.response.ResponseStyleDto;
import dev.danvega.codingagent.style.entity.ResponseStyle;
import dev.danvega.codingagent.style.repo.ResponseStyleRepository;
import dev.danvega.codingagent.style.service.ResponseStyleService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
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

    /** Seed built-in presets once, after the schema has been initialized and the context is ready. */
    @EventListener(ApplicationReadyEvent.class)
    public void seedPresets() {
        try {
            if (repository.count() > 0) {
                return;
            }
            long now = Instant.now().getEpochSecond();
            for (Preset p : PRESETS) {
                ResponseStyle s = new ResponseStyle();
                s.setName(p.name());
                s.setDescription(p.description());
                s.setInstructions(p.instructions());
                repository.create(s, now);
            }
            log.info("Seeded {} built-in response styles", PRESETS.size());
        } catch (RuntimeException e) {
            log.warn("Failed to seed response style presets: {}", e.getMessage());
        }
    }

    @Override
    public List<ResponseStyleDto> list() {
        return repository.findAll().stream().map(this::toDto).toList();
    }

    @Override
    public ResponseStyleDto get(String id) {
        return toDto(requireEntity(id));
    }

    @Override
    public ResponseStyleDto create(CreateStyleRequest request) {
        long now = Instant.now().getEpochSecond();
        ResponseStyle s = new ResponseStyle();
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

    private record Preset(String name, String description, String instructions) {
    }

    private static final List<Preset> PRESETS = List.of(
            new Preset("Concise",
                    "Short, direct answers with no filler.",
                    "Answer as briefly as possible. Lead with the direct answer in one or two sentences. "
                            + "Omit pleasantries, caveats, and background unless explicitly asked. "
                            + "Prefer the shortest correct response."),
            new Preset("Detailed / Technical",
                    "Thorough, precise explanations for technical readers.",
                    "Give a thorough, technically precise answer. Explain the reasoning and any relevant "
                            + "trade-offs, edge cases, and assumptions. Use correct terminology and include code "
                            + "or concrete examples where they aid understanding. Assume an expert audience."),
            new Preset("ELI5",
                    "Plain-language explanations a beginner can follow.",
                    "Explain things as if to a curious beginner. Avoid jargon; when a technical term is "
                            + "unavoidable, define it in plain language. Use simple analogies and everyday examples. "
                            + "Keep sentences short and friendly."),
            new Preset("Executive Summary",
                    "Outcome-focused summary for decision-makers.",
                    "Respond like a briefing for a busy executive. Start with the bottom line / recommendation, "
                            + "then 2-4 supporting points. Focus on outcomes, impact, and decisions rather than "
                            + "implementation detail. Keep it tight and skimmable."),
            new Preset("Friendly Coach",
                    "Warm, encouraging, step-by-step guidance.",
                    "Respond like a supportive coach. Be warm and encouraging, break guidance into clear "
                            + "actionable steps, and check the reader's understanding along the way. Motivate without "
                            + "being condescending."),
            new Preset("Bulleted",
                    "Scannable bullet-point structure.",
                    "Structure the entire response as scannable bullet points and short headings rather than "
                            + "prose paragraphs. Keep each bullet to a single idea. Use nested bullets for detail.")
    );
}
