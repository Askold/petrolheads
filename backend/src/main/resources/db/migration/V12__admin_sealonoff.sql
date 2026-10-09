-- Bound to the Telegram id on first login, like the other username-only admins.
INSERT INTO admins (username) VALUES ('sealonoff') ON CONFLICT (username) DO NOTHING;
