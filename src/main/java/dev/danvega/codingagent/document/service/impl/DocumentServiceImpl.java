package dev.danvega.codingagent.document.service.impl;

import dev.danvega.codingagent.applicationconfig.exceptions.ResourceNotFoundException;
import dev.danvega.codingagent.assistant.service.AssistantService;
import dev.danvega.codingagent.document.dto.request.UpdateDocumentRequest;
import dev.danvega.codingagent.document.dto.response.DocumentDto;
import dev.danvega.codingagent.document.entity.AgentDocument;
import dev.danvega.codingagent.document.repo.AgentDocumentRepository;
import dev.danvega.codingagent.document.service.DocumentService;
import dev.danvega.codingagent.document.storage.DocumentBlobStore;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.ai.reader.tika.TikaDocumentReader;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Per-assistant RAG documents. On upload the raw file is stored in Azure Blob, then parsed (Tika),
 * chunked ({@link TokenTextSplitter}) and embedded into the Spring-managed {@code vector_store}.
 * Each chunk is tagged with {@code assistant_id} / {@code document_id} metadata so retrieval can be
 * scoped per assistant via a filter expression and a document's chunks can be purged on delete.
 */
@Service
@Slf4j
public class DocumentServiceImpl implements DocumentService {

    private final AgentDocumentRepository repository;
    private final AssistantService assistantService;
    private final DocumentBlobStore blobStore;
    private final VectorStore vectorStore;
    private final TokenTextSplitter splitter = new TokenTextSplitter();

    public DocumentServiceImpl(AgentDocumentRepository repository,
                               AssistantService assistantService,
                               DocumentBlobStore blobStore,
                               VectorStore vectorStore) {
        this.repository = repository;
        this.assistantService = assistantService;
        this.blobStore = blobStore;
        this.vectorStore = vectorStore;
    }

    @Override
    public List<DocumentDto> list(String assistantId) {
        return repository.findByAssistant(assistantId).stream().map(this::toDto).toList();
    }

    @Override
    public DocumentDto get(String id) {
        return toDto(requireEntity(id));
    }

    @Override
    public DocumentDto create(String assistantId, MultipartFile file) {
        assistantService.requireEntity(assistantId); // 404 if assistant is unknown
        requireBlob();
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("A document file (.txt, .md, .pdf, .docx) is required.");
        }
        String filename = firstNonBlank(file.getOriginalFilename(), "document");
        String prefix = UUID.randomUUID() + "/";

        // Store the raw upload, then create the management row so we have a stable document_id to tag
        // chunks with. Embedding happens after, and the chunk count is written back to the row.
        blobStore.upload(prefix + filename, bytes(file));

        long now = Instant.now().getEpochSecond();
        AgentDocument doc = new AgentDocument();
        doc.setAssistantId(assistantId);
        doc.setName(filename);
        doc.setBlobPrefix(prefix);
        doc.setChunkCount(0);
        doc.setEnabled(true);
        String id = repository.create(doc, now);

        int chunkCount = embed(file, assistantId, id, filename);
        repository.updateChunkCount(id, chunkCount, now);

        log.info("Created document {} ({}) for assistant {} with {} chunk(s)", id, filename, assistantId, chunkCount);
        return get(id);
    }

    @Override
    public DocumentDto update(String id, UpdateDocumentRequest request) {
        AgentDocument existing = requireEntity(id);
        long now = Instant.now().getEpochSecond();
        if (request.getName() != null && !request.getName().isBlank()) {
            existing.setName(request.getName().trim());
        }
        if (request.getEnabled() != null) {
            existing.setEnabled(request.getEnabled());
        }
        repository.update(existing, now);
        return get(id);
    }

    @Override
    public void delete(String id) {
        AgentDocument doc = requireEntity(id);
        // Remove embedded chunks first, then the row, then the blob (best-effort).
        try {
            vectorStore.delete("document_id == '" + id + "'");
        } catch (RuntimeException e) {
            log.warn("Failed to delete vector chunks for document {}: {}", id, e.getMessage());
        }
        repository.delete(id);
        try {
            if (blobStore.isConfigured()) {
                blobStore.deletePrefix(doc.getBlobPrefix());
            }
        } catch (RuntimeException e) {
            log.warn("Deleted document {} row but failed to remove blobs under {}: {}",
                    id, doc.getBlobPrefix(), e.getMessage());
        }
        log.info("Deleted document {}", id);
    }

    @Override
    public int enabledCount(String assistantId) {
        return repository.countEnabledByAssistant(assistantId);
    }

    @Override
    public void purgeForAssistant(String assistantId) {
        try {
            vectorStore.delete("assistant_id == '" + assistantId + "'");
        } catch (RuntimeException e) {
            log.warn("Failed to purge vector chunks for assistant {}: {}", assistantId, e.getMessage());
        }
    }

    /** Parse + chunk + embed the file into the vector store; returns the number of chunks stored. */
    private int embed(MultipartFile file, String assistantId, String documentId, String filename) {
        Resource resource = new ByteArrayResource(bytes(file)) {
            @Override
            public String getFilename() {
                return filename; // lets Tika pick the right parser from the extension
            }
        };
        List<Document> parsed = new TikaDocumentReader(resource).get();
        List<Document> chunks = splitter.apply(parsed);
        if (chunks.isEmpty()) {
            return 0;
        }
        List<Document> enriched = chunks.stream().map(c -> {
            Map<String, Object> md = new HashMap<>(c.getMetadata());
            md.put("assistant_id", assistantId);
            md.put("document_id", documentId);
            md.put("filename", filename);
            return Document.builder().text(c.getText()).metadata(md).build();
        }).toList();
        vectorStore.add(enriched);
        return enriched.size();
    }

    private AgentDocument requireEntity(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + id));
    }

    private void requireBlob() {
        if (!blobStore.isConfigured()) {
            throw new IllegalArgumentException(
                    "Azure Blob is not configured. Set azure.storage.blob.connection-string to manage documents.");
        }
    }

    private static byte[] bytes(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (java.io.IOException e) {
            throw new IllegalArgumentException("Could not read uploaded file: " + e.getMessage(), e);
        }
    }

    private DocumentDto toDto(AgentDocument d) {
        return DocumentDto.builder()
                .id(d.getId())
                .assistantId(d.getAssistantId())
                .name(d.getName())
                .chunkCount(d.getChunkCount())
                .enabled(d.isEnabled())
                .createdAt(d.getCreatedAt())
                .updatedAt(d.getUpdatedAt())
                .build();
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                return v.trim();
            }
        }
        return "document";
    }
}
