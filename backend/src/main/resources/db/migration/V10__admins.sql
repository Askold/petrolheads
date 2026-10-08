-- Admins managed from the app (in addition to ADMIN_TELEGRAM_IDS in the environment).
-- A row may start with only a username; the Telegram id is bound on that user's first login,
-- after which matching is by id so a later username change can't hand admin to someone else.
CREATE TABLE admins (
    id          BIGSERIAL PRIMARY KEY,
    username    VARCHAR(64) UNIQUE,
    telegram_id BIGINT UNIQUE,
    added_by    BIGINT REFERENCES users (id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (username IS NOT NULL OR telegram_id IS NOT NULL)
);

INSERT INTO admins (username) VALUES ('whoisitalex');
