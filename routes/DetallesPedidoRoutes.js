const express = require("express");
const router = express.Router();
const {
    createOrderDetails,
    updateOrderQuantity,
    getOrderDetailsById,
    getUserOrderDetails,
} = require("../controllers/DetallesPedidoController");
const { authenticateToken } = require("../Middlewares/authMiddleware");
const { checkRole } = require("../Middlewares/roleMiddleware");

// Crear detalles automáticamente al generar un pedido
router.post("/pedidos/:id/detalles", authenticateToken, checkRole([3]), createOrderDetails);

// Modificar cantidades de productos en un pedido (Clientes: solo si está "Por pagar")
router.put("/pedidos/:id/detalles", authenticateToken, checkRole([3]), updateOrderQuantity);

// Obtener los detalles de un pedido por ID (Admin, Empleado, Cliente propietario)
router.get("/pedidos/:id/detalles", authenticateToken, getOrderDetailsById);

// Obtener detalles de los pedidos del usuario (solo los propios pedidos del cliente)
router.get("/pedidos/detalles", authenticateToken, getUserOrderDetails);

module.exports = router;
