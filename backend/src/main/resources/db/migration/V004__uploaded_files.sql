-- V004: Uploaded file ownership metadata
CREATE TABLE IF NOT EXISTS uploaded_files (
    id              BIGSERIAL       PRIMARY KEY,
    object_name     VARCHAR(255)    NOT NULL UNIQUE,
    original_name   VARCHAR(512),
    content_type    VARCHAR(128)    NOT NULL,
    size_bytes      BIGINT          NOT NULL,
    uploader_id     BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_uploaded_files_uploader_id ON uploaded_files(uploader_id);
