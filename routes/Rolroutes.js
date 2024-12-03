const express = require("express");
const router = express.Router();
const { createRol, getRoles, getRolById } = require("../controllers/RolController");
const { authenticateToken } = require("../Middlewares/authMiddleware");
const { checkRole } = require("../Middlewares/roleMiddleware");

// Rutas protegidas por autenticación y rol de administrador
// Ruta para crear nuevo rol (solo Admin)
router.post("/roles", authenticateToken, checkRole([1]), createRol);

// Ruta para obtener todos los roles (solo Admin)
router.get("/roles", authenticateToken, checkRole([1]), getRoles);

// Ruta para obtener rol por id (solo Admin)
router.get("/roles/:id", authenticateToken, checkRole([1]), getRolById);

module.exports = router;
