package dev.danvega.codingagent.tool.auth.controller;

import dev.danvega.codingagent.applicationconfig.constants.ApiConstants;
import dev.danvega.codingagent.tool.auth.dto.request.CreateAuthProfileRequest;
import dev.danvega.codingagent.tool.auth.dto.request.UpdateAuthProfileRequest;
import dev.danvega.codingagent.tool.auth.dto.response.ToolAuthProfileDto;
import dev.danvega.codingagent.tool.auth.service.ToolAuthProfileService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping(ApiConstants.TOOL_AUTH_PATH)
@CrossOrigin(origins = "*")
public class ToolAuthController {

    private final ToolAuthProfileService service;

    public ToolAuthController(ToolAuthProfileService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<ToolAuthProfileDto>> list() {
        return ResponseEntity.ok(service.list());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ToolAuthProfileDto> get(@PathVariable String id) {
        return ResponseEntity.ok(service.get(id));
    }

    @PostMapping
    public ResponseEntity<ToolAuthProfileDto> create(@RequestBody CreateAuthProfileRequest request) {
        return ResponseEntity.ok(service.create(request));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ToolAuthProfileDto> update(@PathVariable String id,
                                                     @RequestBody UpdateAuthProfileRequest request) {
        return ResponseEntity.ok(service.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
