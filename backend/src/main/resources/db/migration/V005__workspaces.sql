-- V005: Workspace foundation for team collaboration
CREATE TABLE IF NOT EXISTS workspaces (
    id              VARCHAR(64)     PRIMARY KEY,
    name            VARCHAR(128)    NOT NULL,
    owner_id        BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_members (
    id              BIGSERIAL       PRIMARY KEY,
    workspace_id    VARCHAR(64)     NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id         BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(16)     NOT NULL DEFAULT 'member',
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);

INSERT INTO workspaces (id, name, owner_id)
SELECT 'personal-' || u.id,
       COALESCE(NULLIF(u.display_name, ''), u.username) || ' 的空间',
       u.id
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM workspaces w WHERE w.id = 'personal-' || u.id
);

INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT 'personal-' || u.id, u.id, 'owner'
FROM users u
WHERE NOT EXISTS (
    SELECT 1
    FROM workspace_members wm
    WHERE wm.workspace_id = 'personal-' || u.id
      AND wm.user_id = u.id
);

ALTER TABLE documents ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(64);

UPDATE documents d
SET workspace_id = 'personal-' || d.owner_id
WHERE d.workspace_id IS NULL;

ALTER TABLE documents
    ALTER COLUMN workspace_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_documents_workspace'
          AND conrelid = 'documents'::regclass
    ) THEN
        ALTER TABLE documents
            ADD CONSTRAINT fk_documents_workspace
            FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_documents_workspace_updated ON documents(workspace_id, updated_at DESC);
