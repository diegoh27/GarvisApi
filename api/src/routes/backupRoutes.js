const { Router } = require("express");
const router = Router();
const { downloadBackup } = require("../controllers/backupController");
const { authenticateToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/authorizeRoles");

router.get("/", authenticateToken, authorizeRoles("admin"), downloadBackup);

module.exports = router;
