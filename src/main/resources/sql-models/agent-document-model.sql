-- Per-assistant RAG documents. The raw uploaded file lives in Azure Blob under blob_prefix;
-- its chunked + embedded text lives in the Spring-managed `vector_store` table, tagged with
-- metadata { assistant_id, document_id, filename }. This table is the management/listing record
-- so the UI can list, toggle, and delete a document (and we can purge the matching chunks).
CREATE TABLE IF NOT EXISTS agent_document (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assistant_id UUID NOT NULL REFERENCES assistant (id) ON DELETE CASCADE,
    name         VARCHAR(300) NOT NULL,
    blob_prefix  TEXT NOT NULL,
    chunk_count  INT NOT NULL DEFAULT 0,
    enabled      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   BIGINT NOT NULL,
    updated_at   BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_document_assistant ON agent_document (assistant_id);
