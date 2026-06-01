-- Spring AI's PgVectorStore can auto-create this table, but only by running
-- `CREATE EXTENSION hstore` first, which Azure Database for PostgreSQL rejects
-- unless hstore is allow-listed via the `azure.extensions` server parameter.
-- Spring AI never uses hstore at runtime (metadata is stored as JSON), so we
-- create the table ourselves here using only the allow-listed `vector` extension
-- and keep `spring.ai.vectorstore.pgvector.initialize-schema: false`.
--
-- text-embedding-3-large yields 3072-dim vectors; pgvector's hnsw/ivfflat ANN
-- indexes cap at 2000 dims, so we run with no vector index (sequential scan).
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS vector_store (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    content     text,
    metadata    json,
    embedding   vector(3072)
);
