const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authMiddleware");
const adminController = require("../controllers/adminController");
const { requireAnyPermission } = require("../middleware/permissionMiddleware");

router.get(
  "/users/pending",
  authenticate,
  requireAnyPermission("admin:*", "admin:read_pending_users", "users:approve"),
  adminController.getPendingUsers
);

router.patch(
  "/users/:userId/approve",
  authenticate,
  requireAnyPermission("admin:*", "users:approve"),
  adminController.approveUser
);

router.patch(
  "/users/:userId/reject",
  authenticate,
  requireAnyPermission("admin:*", "users:approve"),
  adminController.rejectUser
);

module.exports = router;