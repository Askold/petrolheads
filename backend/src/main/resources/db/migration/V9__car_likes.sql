-- One like per driver per car; drives the style rating.
CREATE TABLE car_likes (
    car_id     BIGINT      NOT NULL REFERENCES cars (id) ON DELETE CASCADE,
    user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (car_id, user_id)
);
CREATE INDEX car_likes_user_idx ON car_likes (user_id);
