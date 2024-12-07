const express = require("express");
const router = express.Router();
const {
    getSaleById,
    getUserSales,
    getAllSales,
    updateSaleStatus,
    requestRefund,
    getSaleDetails,
} = require("../controllers/VentasController");
const { authenticateToken } = require("../Middlewares/authMiddleware");
const { checkRole } = require("../Middlewares/roleMiddleware");

// Obtener una venta por ID (Admin, Empleado, Cliente propietario)
router.get("/ventas/:id", authenticateToken, getSaleById);

// Obtener todas las ventas de un usuario (Clientes: solo sus propias ventas)
router.get("/ventas", authenticateToken, checkRole([3]), getUserSales);

// Obtener todas las ventas (Admin, Empleado)
router.get("/ventas/todas", authenticateToken, checkRole([1, 2]), getAllSales);

// Obtener detalles de un pedido asociado a una venta
router.get("/ventas/:id/detalles", authenticateToken, getSaleDetails);

// Actualizar estado de una venta (Admin, Empleado)
router.put("/ventas/:id/estado", authenticateToken, checkRole([1, 2]), updateSaleStatus);

// Solicitar reembolso de una venta (Clientes)
router.put("/ventas/:id/reembolso", authenticateToken, checkRole([3]), requestRefund);

module.exports = router;
