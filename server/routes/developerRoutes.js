const express = require("express");
const pool = require("../config/db");

const router = express.Router();

router.get("/dashboard", async (req, res) => {
  try {
    const users = await pool.query(`SELECT id,name,email,role FROM users`);
    const documents = await pool.query(`SELECT * FROM documents`);
    const students = await pool.query(`SELECT * FROM students`);

    res.json({ success: true, users: users.rows, documents: documents.rows, students: students.rows });
  } catch (err) {
    console.log("DASHBOARD ERROR:", err);
    res.status(500).json({ success: false, message: "Dashboard error" });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const docCount = await pool.query(`SELECT COUNT(*)::int AS count FROM documents`);
    const tampered = await pool.query(`SELECT COUNT(*)::int AS count FROM documents WHERE tampered=true`);
    const issuerCount = await pool.query(`SELECT COUNT(*)::int AS count FROM users WHERE role='issuer'`);

    return res.json({
      success: true,
      stats: {
        documentsUploaded: docCount.rows[0]?.count || 0,
        verificationRequests: 0,
        tamperedDocuments: tampered.rows[0]?.count || 0,
        blockchainTransactions: docCount.rows[0]?.count || 0,
        activeIssuers: issuerCount.rows[0]?.count || 1,
        successRate: 98,
      },
      trends: [
        { name: "Mon", uploads: 4, verifications: 8, tampered: 0 },
        { name: "Tue", uploads: 8, verifications: 14, tampered: 1 },
        { name: "Wed", uploads: 12, verifications: 22, tampered: 0 },
        { name: "Thu", uploads: 18, verifications: 36, tampered: 1 },
        { name: "Fri", uploads: 24, verifications: 52, tampered: 2 },
      ],
    });
  } catch (err) {
    console.log("STATS ERROR:", err);
    res.status(500).json({ success: false, message: "Stats error" });
  }
});

module.exports = router;
