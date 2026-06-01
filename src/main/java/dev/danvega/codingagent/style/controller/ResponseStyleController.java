package dev.danvega.codingagent.style.controller;

import dev.danvega.codingagent.applicationconfig.constants.ApiConstants;
import dev.danvega.codingagent.style.dto.request.CreateStyleRequest;
import dev.danvega.codingagent.style.dto.request.UpdateStyleRequest;
import dev.danvega.codingagent.style.dto.response.ResponseStyleDto;
import dev.danvega.codingagent.style.service.ResponseStyleService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping(ApiConstants.RESPONSE_STYLES_PATH)
@CrossOrigin(origins = "*")
public class ResponseStyleController {

    private final ResponseStyleService service;

    public ResponseStyleController(ResponseStyleService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<ResponseStyleDto>> list(@RequestParam String assistantId) {
        return ResponseEntity.ok(service.list(assistantId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResponseStyleDto> get(@PathVariable String id) {
        return ResponseEntity.ok(service.get(id));
    }

    @PostMapping
    public ResponseEntity<ResponseStyleDto> create(@RequestParam String assistantId,
                                                   @RequestBody CreateStyleRequest request) {
        return ResponseEntity.ok(service.create(assistantId, request));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ResponseStyleDto> update(@PathVariable String id,
                                                   @RequestBody UpdateStyleRequest request) {
        return ResponseEntity.ok(service.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
