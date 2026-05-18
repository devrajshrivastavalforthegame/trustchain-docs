-- Optional dynamic RBAC schema for TrustChain Docs.
-- Safe to run, but not required for the default demo-safe patch.

CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(80) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

INSERT INTO roles(name, description) VALUES
  ('developer', 'Developer/admin superuser'),
  ('admin', 'Platform administrator'),
  ('issuer', 'Approved issuer'),
  ('employer', 'Approved employer/verifier'),
  ('student', 'Student credential owner')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions(name, description) VALUES
  ('admin:*', 'All administrative permissions'),
  ('users:approve', 'Approve or reject pending users'),
  ('admin:read_pending_users', 'Read pending user approvals'),
  ('documents:issue', 'Issue documents'),
  ('documents:verify', 'Verify documents')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name IN ('developer', 'admin') AND p.name IN ('admin:*', 'users:approve', 'admin:read_pending_users')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'issuer' AND p.name = 'documents:issue'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'employer' AND p.name = 'documents:verify'
ON CONFLICT DO NOTHING;
