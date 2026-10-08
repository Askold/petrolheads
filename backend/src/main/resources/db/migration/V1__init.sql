CREATE TABLE users (
    id           BIGSERIAL PRIMARY KEY,
    telegram_id  BIGINT       NOT NULL UNIQUE,
    username     VARCHAR(64),
    first_name   VARCHAR(128) NOT NULL,
    photo_url    TEXT,
    nickname     VARCHAR(32),
    crew         VARCHAR(32),
    bio          VARCHAR(280),
    rep          INT          NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE cars (
    id               BIGSERIAL PRIMARY KEY,
    user_id          BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    make             VARCHAR(64)  NOT NULL,
    model            VARCHAR(64)  NOT NULL,
    year             INT,
    color            VARCHAR(32),
    hp               INT,
    torque_nm        INT,
    weight_kg        INT,
    drivetrain       VARCHAR(8),
    mods             JSONB        NOT NULL DEFAULT '[]',
    is_main          BOOLEAN      NOT NULL DEFAULT FALSE,
    photo_url        TEXT,
    garage_image_url TEXT,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX cars_user_idx ON cars (user_id);

CREATE TABLE tracks (
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(128) NOT NULL,
    layout     VARCHAR(64),
    country    VARCHAR(64),
    length_m   INT,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (name, layout)
);

CREATE TABLE lap_times (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    car_id      BIGINT      NOT NULL REFERENCES cars (id) ON DELETE CASCADE,
    track_id    BIGINT      NOT NULL REFERENCES tracks (id) ON DELETE CASCADE,
    time_ms     INT         NOT NULL CHECK (time_ms > 0),
    lap_date    DATE        NOT NULL,
    conditions  VARCHAR(16),
    tyres       VARCHAR(64),
    proof_url   TEXT,
    status      VARCHAR(16) NOT NULL DEFAULT 'pending',
    verified_by BIGINT      REFERENCES users (id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX lap_times_track_status_idx ON lap_times (track_id, status, time_ms);
CREATE INDEX lap_times_user_idx ON lap_times (user_id);

INSERT INTO tracks (name, layout, country, length_m) VALUES
    ('Nürburgring Nordschleife', 'Touristenfahrten', 'Germany', 20832),
    ('Spa-Francorchamps', 'GP', 'Belgium', 7004),
    ('Hockenheimring', 'GP', 'Germany', 4574);
