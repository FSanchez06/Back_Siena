const express = require("express");
const router = express.Router();
const {
    createOrder,
    getOrderById,
    getUserOrders,
    updateDeliveryDateByClient,
    updateDeliveryDateByAdmin,
    updateOrderQuantity,
    deleteProductFromOrder,
    cancelOrder,
    processPayment,
} = require("../controllers/PedidosController");
const { authenticateToken } = require("../Middlewares/authMiddleware");
const { checkRole } = require("../Middlewares/roleMiddleware");

// Crear un nuevo pedido (Cliente)
router.post("/pedidos", authenticateToken, checkRole([3]), createOrder);

// Obtener detalles de un pedido (Admin, Empleado, Cliente propietario)
router.get("/pedidos/:id", authenticateToken, getOrderById);

// Obtener pedidos del usuario (Cliente: sus pedidos, Admin/Empleado: todos)
router.get("/pedidos", authenticateToken, getUserOrders);

// Modificar fecha de entrega (Clientes y Admin/Empleado)
router.put("/pedidos/:id/fecha-entrega/cliente", authenticateToken, checkRole([3]), updateDeliveryDateByClient);
router.put("/pedidos/:id/fecha-entrega/admin", authenticateToken, checkRole([1, 2]), updateDeliveryDateByAdmin);

// Modificar cantidades de productos (Clientes: solo si está "Por pagar")
router.put("/pedidos/:id/cantidades", authenticateToken, checkRole([3]), updateOrderQuantity);

// Eliminar un producto de un pedido (Clientes: solo si está "Por pagar")
router.delete("/pedidos/:pedidoId/productos/:productId", authenticateToken, checkRole([3]), deleteProductFromOrder);

// Cancelar un pedido (Clientes: solo si está "Por pagar")
router.put("/pedidos/:id/cancelar", authenticateToken, checkRole([3]), cancelOrder);

// Procesar pago de un pedido (Cliente)
router.put("/pedidos/:id/pagar", authenticateToken, checkRole([3]), processPayment);

module.exports = router;
