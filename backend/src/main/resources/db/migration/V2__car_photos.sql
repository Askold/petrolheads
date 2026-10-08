CREATE TABLE car_photos (
    id         BIGSERIAL PRIMARY KEY,
    car_id     BIGINT      NOT NULL REFERENCES cars (id) ON DELETE CASCADE,
    file_name  VARCHAR(64) NOT NULL UNIQUE,
    width      INT         NOT NULL,
    height     INT         NOT NULL,
    source     VARCHAR(8)  NOT NULL, -- 'app' or 'bot'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX car_photos_car_idx ON car_photos (car_id);
