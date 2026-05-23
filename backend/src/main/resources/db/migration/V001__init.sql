-- ============================================
-- Memorica V001: Initial Schema
-- ============================================

-- Users
CREATE TABLE IF NOT EXISTS users (
    id              BIGSERIAL       PRIMARY KEY,
    username        VARCHAR(32)     NOT NULL UNIQUE,
    email           VARCHAR(255)    NOT NULL UNIQUE,
    password        VARCHAR(255)    NOT NULL,
    display_name    VARCHAR(64),
    avatar          VARCHAR(512),
    color           VARCHAR(7)      NOT NULL DEFAULT '#6b7280',
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMP       NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
    id              VARCHAR(64)     PRIMARY KEY,
    title           VARCHAR(255)    NOT NULL DEFAULT 'Untitled',
    owner_id        BIGINT          NOT NULL REFERENCES users(id),
    owner_name      VARCHAR(64)     NOT NULL,
    word_count      INT             DEFAULT 0,
    char_count      INT             DEFAULT 0,
    cover_image     VARCHAR(512),
    is_public       BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMP       NULL
);

CREATE INDEX idx_documents_owner_id ON documents(owner_id);
CREATE INDEX idx_documents_public_updated ON documents(is_public, updated_at DESC);
CREATE INDEX idx_documents_owner_updated ON documents(owner_id, updated_at DESC);

-- Document Permissions (for collaboration access control)
CREATE TABLE IF NOT EXISTS document_permissions (
    id              BIGSERIAL       PRIMARY KEY,
    document_id     VARCHAR(64)     NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id         BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(16)     NOT NULL DEFAULT 'viewer',  -- owner, editor, viewer
    granted_by      BIGINT          REFERENCES users(id),
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    UNIQUE(document_id, user_id)
);

CREATE INDEX idx_doc_perms_document_id ON document_permissions(document_id);
CREATE INDEX idx_doc_perms_user_id ON document_permissions(user_id);

-- Document Versions (snapshots)
CREATE TABLE IF NOT EXISTS document_versions (
    id              BIGSERIAL       PRIMARY KEY,
    document_id     VARCHAR(64)     NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number  INT             NOT NULL,
    content_json    TEXT            NOT NULL,
    snapshot_html   TEXT,
    word_count      INT             DEFAULT 0,
    char_count      INT             DEFAULT 0,
    editor_name     VARCHAR(64),
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_doc_versions_doc_id ON document_versions(document_id, version_number DESC);

-- Document States (Yjs CRDT persistence for Hocuspocus)
CREATE TABLE IF NOT EXISTS document_states (
    id              VARCHAR(128)    PRIMARY KEY,
    state           BYTEA           NOT NULL,
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_doc_states_updated ON document_states(updated_at);
