CREATE TABLE IF NOT EXISTS assistant (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(200) NOT NULL,
    system_prompt TEXT NOT NULL,
    builtin_tools TEXT NOT NULL DEFAULT '',
    created_at    BIGINT NOT NULL,
    updated_at    BIGINT NOT NULL
);

ALTER TABLE chat_session ADD COLUMN IF NOT EXISTS assistant_id UUID;
