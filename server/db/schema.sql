-- TrustChain Docs complete local PostgreSQL schema
-- Run from server/: npm run db:schema

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('issuer', 'student', 'employer', 'developer', 'admin')),
  organization VARCHAR(255),
  wallet_address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  student_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  enrollment_no VARCHAR(100) NOT NULL,
  roll_no VARCHAR(100),
  course VARCHAR(255),
  student_name_enc TEXT,
  email_enc TEXT,
  enrollment_no_enc TEXT,
  roll_no_enc TEXT,
  enrollment_no_lookup_hash TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  original_file_name TEXT,
  mime_type TEXT,
  file_hash TEXT NOT NULL,
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  polygon_tx TEXT,
  block_number TEXT,
  blockchain_status TEXT DEFAULT 'pending',
  blockchain_error TEXT,
  tampered BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  previous_document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'issued',
  reissue_reason TEXT,
  degree_title TEXT,
  department TEXT,
  graduation_year TEXT,
  university TEXT DEFAULT 'Oriental University',
  gcs_provider TEXT,
  gcs_bucket TEXT,
  gcs_object_name TEXT,
  encryption_metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS verification_requests (
  id SERIAL PRIMARY KEY,
  student_email VARCHAR(255) NOT NULL,
  requester_email VARCHAR(255),
  requester_name VARCHAR(255),
  company VARCHAR(255),
  enrollment_no VARCHAR(100),
  document_hash TEXT,
  uploaded_hash TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  result JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  actor_id TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  failure_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logs (
  id SERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_students_email ON students(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_students_enrollment ON students(LOWER(enrollment_no));
CREATE INDEX IF NOT EXISTS idx_students_enrollment_lookup ON students(enrollment_no_lookup_hash);
CREATE INDEX IF NOT EXISTS idx_documents_file_hash ON documents(LOWER(file_hash));
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_student_id ON documents(student_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_student_email ON verification_requests(LOWER(student_email));
CREATE INDEX IF NOT EXISTS idx_verification_requests_requester_email ON verification_requests(LOWER(requester_email));
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_verification_requests_document_hash ON verification_requests(LOWER(document_hash));
