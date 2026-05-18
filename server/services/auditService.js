
const pool = require("../config/db");

async function ensureAuditTable() {
  await pool.query(`
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
    )
  `);
}

async function audit(req, action, resourceType, resourceId, success = true, failureReason = null) {
  try {
    await ensureAuditTable();
    await pool.query(
      `INSERT INTO audit_logs(actor_id, actor_role, action, resource_type, resource_id, ip_address, user_agent, success, failure_reason)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [req.user?.id || null, req.user?.role || "anonymous", action, resourceType, String(resourceId || ""), req.ip, req.headers["user-agent"], success, failureReason]
    );
  } catch (error) {
    console.log("Audit log skipped:", error.message);
  }
}

module.exports = { audit, ensureAuditTable };
