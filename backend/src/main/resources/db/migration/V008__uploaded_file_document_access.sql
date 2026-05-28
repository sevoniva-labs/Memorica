ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS document_id VARCHAR(64);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_uploaded_files_document'
          AND conrelid = 'uploaded_files'::regclass
    ) THEN
        ALTER TABLE uploaded_files
            ADD CONSTRAINT fk_uploaded_files_document
            FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_uploaded_files_document_id ON uploaded_files(document_id);
