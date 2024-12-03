const express = require("express");
const router = express.Router();
const {
    createMetodoPago,
    getAllMetodosPago,
    updateMetodoPago,
    deleteMetodoPago
} = require("../controllers/MetodoPagoController");
const { authenticateToken } = require("../Middlewares/authMiddleware");
const { checkRole } = require("../Middlewares/roleMiddleware");

// Crear un nuevo método de pago (Administrador)
router.post("/metodospago", authenticateToken, checkRole([1]), createMetodoPago);

// Obtener todos los métodos de pago (Todos los usuarios)
router.get("/metodospago", authenticateToken, getAllMetodosPago);

// Actualizar un método de pago (Administrador o Empleado)
router.put("/metodospago/:id", authenticateToken, checkRole([1, 2]), updateMetodoPago);

// Eliminar un método de pago (Administrador)
router.delete("/metodospago/:id", authenticateToken, checkRole([1]), deleteMetodoPago);

module.exports = router;
