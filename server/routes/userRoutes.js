
const express = require("express");
const { upload, handleMulterError } = require("../middleware/uploadLimit");
const { verifyDocument } = require("../controllers/userController");
const router = express.Router();
router.post("/verify", upload.single("document"), handleMulterError, verifyDocument);
module.exports = router;
