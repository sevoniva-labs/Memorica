-- Memorica Dev Init
-- This runs on first docker-compose up to bootstrap the dev database.

-- Create the memorica database if it doesn't exist
-- (postgres docker image auto-creates POSTGRES_DB, this is a safety net)
SELECT 1;
