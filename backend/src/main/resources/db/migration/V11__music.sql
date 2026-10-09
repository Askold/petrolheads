-- Background music playlist; admins add tracks by sending audio to the bot.
CREATE TABLE music (
    id          BIGSERIAL PRIMARY KEY,
    title       VARCHAR(200),
    performer   VARCHAR(200),
    file_name   VARCHAR(64)  NOT NULL UNIQUE,
    duration_s  INT,
    added_by    BIGINT REFERENCES users (id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
