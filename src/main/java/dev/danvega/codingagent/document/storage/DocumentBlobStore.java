package dev.danvega.codingagent.document.storage;

import com.azure.core.util.BinaryData;
import com.azure.storage.blob.BlobContainerClient;
import com.azure.storage.blob.BlobServiceClient;
import com.azure.storage.blob.BlobServiceClientBuilder;
import com.azure.storage.blob.models.BlobItem;
import com.azure.storage.blob.models.ListBlobsOptions;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Thin wrapper over an Azure Blob container that holds the raw uploaded RAG documents. Blobs are
 * named {@code <documentId>/<originalFilename>}. Mirrors {@code SkillBlobStore}: the container
 * client is created lazily so the app boots even with no connection string configured.
 */
@Component
@Slf4j
public class DocumentBlobStore {

    private final String connectionString;
    private final String containerName;
    private volatile BlobContainerClient container;

    public DocumentBlobStore(@Value("${azure.storage.blob.connection-string:}") String connectionString,
                             @Value("${azure.storage.blob.documents-container:agent-documents}") String containerName) {
        this.connectionString = connectionString;
        this.containerName = containerName;
    }

    public boolean isConfigured() {
        return connectionString != null && !connectionString.isBlank();
    }

    private BlobContainerClient container() {
        if (!isConfigured()) {
            throw new IllegalStateException(
                    "Azure Blob is not configured. Set azure.storage.blob.connection-string "
                            + "(or AZURE_BLOB_CONNECTION_STRING) to manage documents.");
        }
        BlobContainerClient local = container;
        if (local == null) {
            synchronized (this) {
                local = container;
                if (local == null) {
                    BlobServiceClient service = new BlobServiceClientBuilder()
                            .connectionString(connectionString)
                            .buildClient();
                    local = service.getBlobContainerClient(containerName);
                    if (!local.exists()) {
                        local.createIfNotExists();
                        log.info("Created Azure Blob container '{}' for documents", containerName);
                    }
                    container = local;
                }
            }
        }
        return local;
    }

    public void upload(String blobName, byte[] data) {
        container().getBlobClient(blobName).upload(BinaryData.fromBytes(data), true);
    }

    /** Blob names under the given prefix (e.g. "<documentId>/"). */
    public List<String> list(String prefix) {
        List<String> names = new ArrayList<>();
        ListBlobsOptions options = new ListBlobsOptions().setPrefix(prefix);
        for (BlobItem item : container().listBlobs(options, null)) {
            names.add(item.getName());
        }
        return names;
    }

    /** Deletes every blob under the given prefix (e.g. "<documentId>/"). */
    public void deletePrefix(String prefix) {
        for (String name : list(prefix)) {
            container().getBlobClient(name).deleteIfExists();
        }
    }
}
