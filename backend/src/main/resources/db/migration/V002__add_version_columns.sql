-- V002: Add @Version columns for optimistic locking
ALTER TABLE users ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;
ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;

-- Unique constraint to prevent duplicate version numbers per document
ALTER TABLE document_versions ADD CONSTRAINT IF NOT EXISTS uq_doc_version UNIQUE (document_id, version_number);
