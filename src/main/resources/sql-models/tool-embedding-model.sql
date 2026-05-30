CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE agent_tool ADD COLUMN IF NOT EXISTS embedding vector(3072);
ALTER TABLE agent_tool ADD COLUMN IF NOT EXISTS embedding_hash VARCHAR(64);

-- text-embedding-3-large yields 3072-dim vectors. Ensure the column matches even if it was
-- created earlier at a different size. pgvector's hnsw/ivfflat ANN indexes cap at 2000 dims,
-- so there is no vector index here -- an assistant's enabled tool set is small enough that the
-- per-assistant similarity query does a cheap sequential scan.
DROP INDEX IF EXISTS idx_agent_tool_embedding;
ALTER TABLE agent_tool ALTER COLUMN embedding TYPE vector(3072);
