-- V006: Per-user document state and soft-delete governance
CREATE TABLE IF NOT EXISTS document_user_states (
    id              BIGSERIAL       PRIMARY KEY,
    document_id     VARCHAR(64)     NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id         BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_favorite     BOOLEAN         NOT NULL DEFAULT FALSE,
    last_opened_at  TIMESTAMP       NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    UNIQUE(document_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_doc_user_states_user_recent
    ON document_user_states(user_id, last_opened_at DESC);

CREATE INDEX IF NOT EXISTS idx_doc_user_states_user_favorite
    ON document_user_states(user_id, is_favorite, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_documents_deleted_owner_updated
    ON documents(owner_id, deleted_at, updated_at DESC);
