-- V003: Audit log for compliance and security monitoring
CREATE TABLE IF NOT EXISTS audit_log (
    id              BIGSERIAL       PRIMARY KEY,
    user_id         BIGINT          REFERENCES users(id),
    username        VARCHAR(64),
    action          VARCHAR(64)     NOT NULL,
    resource_type   VARCHAR(64),
    resource_id     VARCHAR(128),
    detail          TEXT,
    ip_address      VARCHAR(45),
    trace_id        VARCHAR(32),
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_created_at ON audit_log(created_at);
