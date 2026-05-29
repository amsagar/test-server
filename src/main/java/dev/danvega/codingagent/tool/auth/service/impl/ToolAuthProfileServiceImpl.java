package dev.danvega.codingagent.tool.auth.service.impl;

import dev.danvega.codingagent.applicationconfig.exceptions.ResourceNotFoundException;
import dev.danvega.codingagent.tool.auth.dto.request.CreateAuthProfileRequest;
import dev.danvega.codingagent.tool.auth.dto.request.UpdateAuthProfileRequest;
import dev.danvega.codingagent.tool.auth.dto.response.ToolAuthProfileDto;
import dev.danvega.codingagent.tool.auth.entity.ToolAuthProfile;
import dev.danvega.codingagent.tool.auth.repo.ToolAuthProfileRepository;
import dev.danvega.codingagent.tool.auth.service.EncryptionService;
import dev.danvega.codingagent.tool.auth.service.ToolAuthProfileService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
@Slf4j
public class ToolAuthProfileServiceImpl implements ToolAuthProfileService {

    private final ToolAuthProfileRepository repository;
    private final EncryptionService encryptionService;

    public ToolAuthProfileServiceImpl(ToolAuthProfileRepository repository,
                                      EncryptionService encryptionService) {
        this.repository = repository;
        this.encryptionService = encryptionService;
    }

    @Override
    public List<ToolAuthProfileDto> list() {
        return repository.findAll().stream().map(this::toDto).toList();
    }

    @Override
    public ToolAuthProfileDto get(String id) {
        return toDto(requireEntity(id));
    }

    @Override
    public ToolAuthProfileDto create(CreateAuthProfileRequest request) {
        long now = Instant.now().getEpochSecond();
        ToolAuthProfile p = new ToolAuthProfile();
        p.setName(required(request.getName()));
        p.setDescription(request.getDescription());
        p.setAuthType(request.getAuthType() == null ? "none" : request.getAuthType());
        p.setAuthConfig(request.getAuthConfig());
        p.setEncryptedClientSecret(encryptIfPresent(request.getClientSecret()));
        p.setTokenUrl(request.getTokenUrl());
        p.setScopes(request.getScopes());
        String id = repository.create(p, now);
        log.info("Created auth profile {} ({})", id, p.getName());
        return get(id);
    }

    @Override
    public ToolAuthProfileDto update(String id, UpdateAuthProfileRequest request) {
        ToolAuthProfile existing = requireEntity(id);
        long now = Instant.now().getEpochSecond();
        if (request.getName() != null && !request.getName().isBlank()) {
            existing.setName(request.getName().trim());
        }
        if (request.getDescription() != null) {
            existing.setDescription(request.getDescription());
        }
        if (request.getAuthType() != null) {
            existing.setAuthType(request.getAuthType());
        }
        if (request.getAuthConfig() != null) {
            existing.setAuthConfig(request.getAuthConfig());
        }
        if (request.getTokenUrl() != null) {
            existing.setTokenUrl(request.getTokenUrl());
        }
        if (request.getScopes() != null) {
            existing.setScopes(request.getScopes());
        }
        if (request.getClientSecret() != null && !request.getClientSecret().isBlank()) {
            existing.setEncryptedClientSecret(encryptionService.encrypt(request.getClientSecret()));
        }
        repository.update(existing, now);
        return get(id);
    }

    @Override
    public void delete(String id) {
        requireEntity(id);
        repository.delete(id);
        log.info("Deleted auth profile {}", id);
    }

    @Override
    public ToolAuthProfile requireEntity(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Auth profile not found: " + id));
    }

    private String encryptIfPresent(String value) {
        return value == null || value.isBlank() ? null : encryptionService.encrypt(value);
    }

    private ToolAuthProfileDto toDto(ToolAuthProfile p) {
        return ToolAuthProfileDto.builder()
                .id(p.getId())
                .name(p.getName())
                .description(p.getDescription())
                .authType(p.getAuthType())
                .authConfig(p.getAuthConfig())
                .tokenUrl(p.getTokenUrl())
                .scopes(p.getScopes())
                .hasClientSecret(p.getEncryptedClientSecret() != null && !p.getEncryptedClientSecret().isBlank())
                .hasAccessToken(p.getEncryptedAccessToken() != null && !p.getEncryptedAccessToken().isBlank())
                .tokenExpiresAt(p.getTokenExpiresAt())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }

    private static String required(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Auth profile name is required");
        }
        return value.trim();
    }
}
