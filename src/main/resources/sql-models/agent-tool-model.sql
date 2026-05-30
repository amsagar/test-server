CREATE TABLE IF NOT EXISTS tool_auth_profile (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                     VARCHAR(200) NOT NULL,
    description              TEXT,
    auth_type                VARCHAR(50) NOT NULL DEFAULT 'none',
    auth_config              TEXT,
    encrypted_client_secret  TEXT,
    token_url                TEXT,
    scopes                   TEXT,
    encrypted_access_token   TEXT,
    token_expires_at         BIGINT,
    created_at               BIGINT NOT NULL,
    updated_at               BIGINT NOT NULL
);

-- Tools are owned by exactly one assistant (mirrors agent_skill). Previously they were global and
-- linked many-to-many via assistant_agent_tool; that join table is dropped below. Existing global
-- rows can't satisfy the NOT NULL owner, so they're cleared (re-import per assistant afterward).
DROP TABLE IF EXISTS assistant_agent_tool;

CREATE TABLE IF NOT EXISTS agent_tool (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assistant_id    UUID NOT NULL REFERENCES assistant (id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    method          VARCHAR(10) NOT NULL DEFAULT 'GET',
    host            TEXT NOT NULL,
    endpoint        TEXT NOT NULL,
    request_schema  TEXT,
    source_type     VARCHAR(30) NOT NULL DEFAULT 'manual',
    auth_profile_id UUID REFERENCES tool_auth_profile (id) ON DELETE SET NULL,
    auth_type       VARCHAR(50) NOT NULL DEFAULT 'none',
    auth_config     TEXT,
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      BIGINT NOT NULL,
    updated_at      BIGINT NOT NULL
);

-- Migrate an older global agent_tool: clear rows, then add the owner column as NOT NULL (safe on the
-- now-empty table). On a fresh DB the column already exists from CREATE above and these are no-ops.
DELETE FROM agent_tool;
ALTER TABLE agent_tool ADD COLUMN IF NOT EXISTS assistant_id UUID NOT NULL REFERENCES assistant (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_agent_tool_assistant ON agent_tool (assistant_id);
