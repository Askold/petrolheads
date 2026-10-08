-- Manual ordering of tracks in the app: lower first. Evolution Race Park (the group's home track) leads.
ALTER TABLE tracks ADD COLUMN position INT NOT NULL DEFAULT 100;
UPDATE tracks SET position = 0 WHERE name = 'Evolution Race Park (Rostov-on-Don)';
