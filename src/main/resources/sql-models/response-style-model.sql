CREATE TABLE IF NOT EXISTS response_style (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(200) NOT NULL,
    description  TEXT,
    instructions TEXT NOT NULL,
    created_at   BIGINT NOT NULL,
    updated_at   BIGINT NOT NULL
);

-- A session may pin a response style; clearing the style on delete keeps the session usable.
ALTER TABLE chat_session
    ADD COLUMN IF NOT EXISTS style_id UUID REFERENCES response_style (id) ON DELETE SET NULL;
