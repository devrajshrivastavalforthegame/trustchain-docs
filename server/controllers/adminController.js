const pool = require("../config/db");

async function getUserColumns() {
  const result = await pool.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'users'
    `
  );

  return new Set(result.rows.map((row) => row.column_name));
}

function approvalWhereClause(columns) {
  if (columns.has("approval_status")) {
    return "approval_status = 'pending'";
  }

  if (columns.has("status")) {
    return "status = 'pending'";
  }

  if (columns.has("is_approved")) {
    return "is_approved = false";
  }

  // If approval columns are missing, show issuer/employer/admin users
  // so admin dashboard still returns useful data instead of crashing.
  return "role IN ('issuer', 'employer', 'admin')";
}

async function getPendingUsers(_req, res) {
  try {
    const columns = await getUserColumns();
    const whereClause = approvalWhereClause(columns);

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        role,
        ${columns.has("status") ? "status" : "NULL AS status"},
        ${columns.has("approval_status") ? "approval_status" : "NULL AS approval_status"},
        ${columns.has("is_approved") ? "is_approved" : "NULL AS is_approved"},
        created_at
      FROM users
      WHERE ${whereClause}
      ORDER BY created_at DESC
      `
    );

    return res.json({
      success: true,
      users: result.rows
    });
  } catch (error) {
    console.error("getPendingUsers error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load pending users"
    });
  }
}

async function approveUser(req, res) {
  try {
    const { userId } = req.params;
    const columns = await getUserColumns();

    const updates = [];
    const values = [];
    let index = 1;

    if (columns.has("approval_status")) {
      updates.push(`approval_status = $${index++}`);
      values.push("approved");
    }

    if (columns.has("status")) {
      updates.push(`status = $${index++}`);
      values.push("approved");
    }

    if (columns.has("is_approved")) {
      updates.push(`is_approved = $${index++}`);
      values.push(true);
    }

    if (columns.has("approved_by")) {
      updates.push(`approved_by = $${index++}`);
      values.push(req.user.id);
    }

    if (columns.has("approved_at")) {
      updates.push(`approved_at = CURRENT_TIMESTAMP`);
    }

    if (columns.has("updated_at")) {
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "No approval columns found. Run dynamic-rbac-refresh-schema.sql first."
      });
    }

    values.push(userId);

    const result = await pool.query(
      `
      UPDATE users
      SET ${updates.join(", ")}
      WHERE id = $${index}
      RETURNING id, name, email, role
      `,
      values
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.json({
      success: true,
      message: "User approved successfully",
      user: result.rows[0]
    });
  } catch (error) {
    console.error("approveUser error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to approve user"
    });
  }
}

async function rejectUser(req, res) {
  try {
    const { userId } = req.params;
    const columns = await getUserColumns();

    const updates = [];
    const values = [];
    let index = 1;

    if (columns.has("approval_status")) {
      updates.push(`approval_status = $${index++}`);
      values.push("rejected");
    }

    if (columns.has("status")) {
      updates.push(`status = $${index++}`);
      values.push("rejected");
    }

    if (columns.has("is_approved")) {
      updates.push(`is_approved = $${index++}`);
      values.push(false);
    }

    if (columns.has("rejected_by")) {
      updates.push(`rejected_by = $${index++}`);
      values.push(req.user.id);
    }

    if (columns.has("rejected_at")) {
      updates.push(`rejected_at = CURRENT_TIMESTAMP`);
    }

    if (columns.has("updated_at")) {
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "No approval columns found. Run dynamic-rbac-refresh-schema.sql first."
      });
    }

    values.push(userId);

    const result = await pool.query(
      `
      UPDATE users
      SET ${updates.join(", ")}
      WHERE id = $${index}
      RETURNING id, name, email, role
      `,
      values
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.json({
      success: true,
      message: "User rejected successfully",
      user: result.rows[0]
    });
  } catch (error) {
    console.error("rejectUser error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reject user"
    });
  }
}

module.exports = {
  getPendingUsers,
  approveUser,
  rejectUser
};