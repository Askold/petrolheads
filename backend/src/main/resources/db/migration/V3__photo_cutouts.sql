-- Background-removed version of each photo, produced asynchronously by the cutout worker.
ALTER TABLE car_photos
    ADD COLUMN cutout_file   VARCHAR(64),
    ADD COLUMN cutout_status VARCHAR(8) NOT NULL DEFAULT 'pending'; -- pending | done | failed | skipped
