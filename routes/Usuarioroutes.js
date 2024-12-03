const express = require("express");
const router = express.Router();
const { registerUser, loginUser, getAllUsers, getUserById, updateProfilePhoto, toggleUserStatus, updateUserRole, changePassword, updateUserProfile, deleteUser } = require("../controllers/UsuariosController");
const { authenticateToken } = require("../Middlewares/authMiddleware");
const { checkRole } = require("../Middlewares/roleMiddleware");

router.post("/usuarios/register", registerUser);
router.post("/usuarios/login", loginUser);

// Protegemos rutas que requieren autenticación
router.get("/usuarios", authenticateToken, checkRole([1, 2]), getAllUsers);
router.get("/usuarios/:id", authenticateToken, checkRole([1, 2]), getUserById);
router.put("/usuarios/:id/profile-photo", authenticateToken, checkRole([1, 2, 3]), updateProfilePhoto);
router.put("/usuarios/:id/status", authenticateToken, checkRole([1, 2]), toggleUserStatus);
router.put("/usuarios/:id/role", authenticateToken, checkRole([1]), updateUserRole);
router.put("/usuarios/change-password", authenticateToken, checkRole([1, 2, 3]), changePassword);
router.put("/usuarios/:id/update", authenticateToken, updateUserProfile);
router.delete("/usuarios/:id", authenticateToken, checkRole([1]), deleteUser);

module.exports = router;
