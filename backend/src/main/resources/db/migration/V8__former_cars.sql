-- Cars the driver no longer owns stay in their history (with photos and lap times) instead of being deleted.
ALTER TABLE cars ADD COLUMN sold_at DATE;
