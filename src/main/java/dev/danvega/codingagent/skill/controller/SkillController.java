package dev.danvega.codingagent.skill.controller;

import dev.danvega.codingagent.applicationconfig.constants.ApiConstants;
import dev.danvega.codingagent.skill.dto.request.UpdateSkillFileRequest;
import dev.danvega.codingagent.skill.dto.request.UpdateSkillRequest;
import dev.danvega.codingagent.skill.dto.response.SkillDto;
import dev.danvega.codingagent.skill.dto.response.SkillFileContentDto;
import dev.danvega.codingagent.skill.dto.response.SkillFileNodeDto;
import dev.danvega.codingagent.skill.service.SkillService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping(ApiConstants.SKILLS_PATH)
@CrossOrigin(origins = "*")
public class SkillController {

    private final SkillService skillService;

    public SkillController(SkillService skillService) {
        this.skillService = skillService;
    }

    @GetMapping
    public ResponseEntity<List<SkillDto>> list(@RequestParam String assistantId) {
        return ResponseEntity.ok(skillService.list(assistantId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SkillDto> get(@PathVariable String id) {
        return ResponseEntity.ok(skillService.get(id));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<SkillDto> create(@RequestParam String assistantId,
                                           @RequestPart("file") MultipartFile file) {
        return ResponseEntity.ok(skillService.create(assistantId, file));
    }

    @PatchMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<SkillDto> update(@PathVariable String id,
                                           @RequestBody UpdateSkillRequest request) {
        return ResponseEntity.ok(skillService.update(id, request, null));
    }

    @PatchMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<SkillDto> updateContent(@PathVariable String id,
                                                  @RequestPart("file") MultipartFile file) {
        return ResponseEntity.ok(skillService.update(id, null, file));
    }

    @GetMapping("/{id}/files")
    public ResponseEntity<List<SkillFileNodeDto>> listFiles(@PathVariable String id) {
        return ResponseEntity.ok(skillService.listFiles(id));
    }

    @GetMapping("/{id}/files/content")
    public ResponseEntity<SkillFileContentDto> getFileContent(@PathVariable String id,
                                                              @RequestParam String path) {
        return ResponseEntity.ok(skillService.getFileContent(id, path));
    }

    @PutMapping(value = "/{id}/files/content", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<SkillDto> updateFileContent(@PathVariable String id,
                                                      @RequestParam String path,
                                                      @RequestBody UpdateSkillFileRequest request) {
        return ResponseEntity.ok(skillService.updateFileContent(id, path, request.getContent()));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<byte[]> download(@PathVariable String id) {
        SkillDto skill = skillService.get(id);
        byte[] archive = skillService.downloadBundle(id);
        String filename = skill.getName().replaceAll("[^a-zA-Z0-9._-]+", "-") + ".zip";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(archive);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        skillService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
