-- TrustChain Docs security + reissue migration
ALTER TABLE students ADD COLUMN IF NOT EXISTS student_name_enc TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS email_enc TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enrollment_no_enc TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS roll_no_enc TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enrollment_no_lookup_hash TEXT;

ALTER TABLE documents ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS previous_document_id INTEGER;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS reissue_reason TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS gcs_provider TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS gcs_bucket TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS gcs_object_name TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS encryption_metadata JSONB;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS original_file_name TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS mime_type TEXT;

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

-- Google One / Google Drive replacement columns reuse existing generic storage columns.
-- gcs_provider stores 'google-drive' or 'local-private'.
-- gcs_bucket stores 'google-one-drive' or 'local'.
-- gcs_object_name stores an encrypted JSON object, never a raw Drive file ID/path.
ALTER TABLE students ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS gcs_provider TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS gcs_bucket TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS gcs_object_name TEXT;

-- Verification request workflow routed by student Gmail/email.
-- Email is the consent-routing identity; document hash is only for final tamper-proof verification.
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

ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS student_email VARCHAR(255);
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS requester_email VARCHAR(255);
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS requester_name VARCHAR(255);
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS company VARCHAR(255);
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS enrollment_no VARCHAR(100);
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS document_hash TEXT;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS uploaded_hash TEXT;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS result JSONB;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_verification_requests_student_email ON verification_requests(LOWER(student_email));
CREATE INDEX IF NOT EXISTS idx_verification_requests_requester_email ON verification_requests(LOWER(requester_email));
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_verification_requests_document_hash ON verification_requests(LOWER(document_hash));

-- Blockchain status columns added by production hardening patch.
ALTER TABLE documents ADD COLUMN IF NOT EXISTS blockchain_status TEXT DEFAULT 'pending';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS blockchain_error TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS block_number TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS degree_title TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS graduation_year TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS university TEXT DEFAULT 'Oriental University';

CREATE TABLE IF NOT EXISTS logs (
  id SERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
