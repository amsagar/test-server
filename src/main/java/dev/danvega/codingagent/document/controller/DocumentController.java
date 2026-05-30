package dev.danvega.codingagent.document.controller;

import dev.danvega.codingagent.applicationconfig.constants.ApiConstants;
import dev.danvega.codingagent.document.dto.request.UpdateDocumentRequest;
import dev.danvega.codingagent.document.dto.response.DocumentDto;
import dev.danvega.codingagent.document.service.DocumentService;
import org.springframework.http.MediaType;
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
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping(ApiConstants.DOCUMENTS_PATH)
@CrossOrigin(origins = "*")
public class DocumentController {

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @GetMapping
    public ResponseEntity<List<DocumentDto>> list(@RequestParam String assistantId) {
        return ResponseEntity.ok(documentService.list(assistantId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DocumentDto> get(@PathVariable String id) {
        return ResponseEntity.ok(documentService.get(id));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentDto> create(@RequestParam String assistantId,
                                              @RequestPart("file") MultipartFile file) {
        return ResponseEntity.ok(documentService.create(assistantId, file));
    }

    @PatchMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<DocumentDto> update(@PathVariable String id,
                                              @RequestBody UpdateDocumentRequest request) {
        return ResponseEntity.ok(documentService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        documentService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
