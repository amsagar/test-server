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

CREATE TABLE IF NOT EXISTS agent_tool (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE TABLE IF NOT EXISTS assistant_agent_tool (
    assistant_id UUID NOT NULL REFERENCES assistant (id) ON DELETE CASCADE,
    tool_id      UUID NOT NULL REFERENCES agent_tool (id) ON DELETE CASCADE,
    PRIMARY KEY (assistant_id, tool_id)
);
