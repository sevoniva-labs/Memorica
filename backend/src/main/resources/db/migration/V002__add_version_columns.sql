-- V002: Add @Version columns for optimistic locking
ALTER TABLE users ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;
ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;

-- Unique constraint to prevent duplicate version numbers per document
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_doc_version'
          AND conrelid = 'document_versions'::regclass
    ) THEN
        ALTER TABLE document_versions
            ADD CONSTRAINT uq_doc_version UNIQUE (document_id, version_number);
    END IF;
END $$;
