ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role_id INTEGER,
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved_by INTEGER,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS rejected_by INTEGER,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS roles (id SERIAL PRIMARY KEY, name VARCHAR(80) UNIQUE NOT NULL, description TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS permissions (id SERIAL PRIMARY KEY, name VARCHAR(120) UNIQUE NOT NULL, description TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS role_permissions (role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE, permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (role_id, permission_id));
CREATE TABLE IF NOT EXISTS user_permissions (user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE, allowed BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, permission_id));
CREATE TABLE IF NOT EXISTS refresh_tokens (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, token_hash TEXT NOT NULL UNIQUE, expires_at TIMESTAMP NOT NULL, revoked_at TIMESTAMP, revoked_reason TEXT, ip_address TEXT, user_agent TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active ON refresh_tokens(user_id, revoked_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

INSERT INTO roles (name, description) VALUES ('student','Student credential owner'),('issuer','Approved university/institution issuer'),('employer','Approved verifier/employer'),('admin','Platform administrator') ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions (name, description) VALUES
 ('credential:create','Issue a new credential'),('credential:reissue','Reissue an existing credential'),('credential:read_own','Read own credentials'),('verification:request','Create verification request'),('verification:respond_own','Approve or reject own verification request'),('verification:read_status','Read verification request status'),('admin:read_pending_users','Read users pending approval'),('users:approve','Approve or reject users'),('admin:manage_users','Manage user accounts'),('admin:*','Full admin permission') ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id) SELECT r.id,p.id FROM roles r JOIN permissions p ON p.name IN ('credential:read_own','verification:respond_own') WHERE r.name='student' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id) SELECT r.id,p.id FROM roles r JOIN permissions p ON p.name IN ('credential:create','credential:reissue','credential:read_own') WHERE r.name='issuer' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id) SELECT r.id,p.id FROM roles r JOIN permissions p ON p.name IN ('verification:request','verification:read_status') WHERE r.name='employer' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id) SELECT r.id,p.id FROM roles r JOIN permissions p ON p.name IN ('admin:*','admin:read_pending_users','users:approve','admin:manage_users') WHERE r.name='admin' ON CONFLICT DO NOTHING;

UPDATE users u SET role_id=r.id FROM roles r WHERE u.role_id IS NULL AND LOWER(COALESCE(u.role,'student'))=LOWER(r.name);
UPDATE users SET status=COALESCE(status, CASE WHEN LOWER(COALESCE(role,'student')) IN ('issuer','employer','admin') THEN 'pending' ELSE 'approved' END);
