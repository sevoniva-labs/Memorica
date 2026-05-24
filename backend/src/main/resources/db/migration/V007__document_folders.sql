ALTER TABLE documents ADD COLUMN IF NOT EXISTS parent_id VARCHAR(64);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS item_type VARCHAR(16) NOT NULL DEFAULT 'document';

UPDATE documents
SET item_type = 'document'
WHERE item_type IS NULL;

ALTER TABLE documents
    DROP CONSTRAINT IF EXISTS fk_documents_parent;

ALTER TABLE documents
    ADD CONSTRAINT fk_documents_parent
        FOREIGN KEY (parent_id) REFERENCES documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_workspace_parent_updated
    ON documents(workspace_id, parent_id, deleted_at, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_documents_parent
    ON documents(parent_id);
