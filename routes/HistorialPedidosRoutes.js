const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../Middlewares/authMiddleware");
const { checkRole } = require("../Middlewares/roleMiddleware");
const {
  getHistorialPedidosByUser,
  getDetallesPedidoHistorial
} = require("../controllers/HistorialPedidosController");

// Rutas protegidas para el historial de pedidos (clientes)
router.get("/historial-pedidos", authenticateToken, checkRole([1, 2, 3]), getHistorialPedidosByUser);
router.get("/historial-pedidos/:id/detalles", authenticateToken, checkRole([1, 2, 3]), getDetallesPedidoHistorial);

module.exports = router;
