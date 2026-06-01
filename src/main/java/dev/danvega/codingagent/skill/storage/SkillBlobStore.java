package dev.danvega.codingagent.skill.storage;

import com.azure.storage.blob.BlobContainerClient;
import com.azure.storage.blob.BlobServiceClient;
import com.azure.storage.blob.BlobServiceClientBuilder;
import com.azure.storage.blob.models.BlobItem;
import com.azure.storage.blob.models.ListBlobsOptions;
import com.azure.core.util.BinaryData;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Thin wrapper over an Azure Blob container that holds skill bundles. Blobs are named
 * {@code <skillId>/<relativePath>} (e.g. {@code <id>/SKILL.md}, {@code <id>/scripts/run.py}).
 *
 * <p>The container client is created lazily so the application boots even when no connection
 * string is configured; skill features then report as unavailable rather than failing startup.
 */
@Component
@Slf4j
public class SkillBlobStore {

    private final String connectionString;
    private final String containerName;
    private volatile BlobContainerClient container;

    public SkillBlobStore(@Value("${azure.storage.blob.connection-string:}") String connectionString,
                          @Value("${azure.storage.blob.skills-container:agent-skills}") String containerName) {
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
                            + "(or AZURE_BLOB_CONNECTION_STRING) to manage skills.");
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
                        log.info("Created Azure Blob container '{}' for skills", containerName);
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

    /** Blob names under the given prefix (e.g. "<skillId>/"). */
    public List<String> list(String prefix) {
        List<String> names = new ArrayList<>();
        ListBlobsOptions options = new ListBlobsOptions().setPrefix(prefix);
        for (BlobItem item : container().listBlobs(options, null)) {
            names.add(item.getName());
        }
        return names;
    }

    public byte[] download(String blobName) {
        return container().getBlobClient(blobName).downloadContent().toBytes();
    }

    /**
     * Deletes every blob under the given prefix (e.g. "<skillId>/"). Names are deleted
     * deepest-first (reverse-sorted) so that on hierarchical-namespace (ADLS Gen2) accounts a
     * directory marker is removed only after the files inside it — otherwise Azure rejects the
     * directory delete with 409 DirectoryIsNotEmpty. Each delete is best-effort: a failure on one
     * blob is logged and skipped rather than aborting the whole cleanup.
     */
    public void deletePrefix(String prefix) {
        List<String> names = list(prefix);
        names.sort(Comparator.reverseOrder());
        for (String name : names) {
            try {
                container().getBlobClient(name).deleteIfExists();
            } catch (RuntimeException e) {
                log.warn("Failed to delete blob {}: {}", name, e.getMessage());
            }
        }
    }
}
