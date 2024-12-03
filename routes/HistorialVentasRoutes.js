const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../Middlewares/authMiddleware");
const { checkRole } = require("../Middlewares/roleMiddleware");
const {
  getHistorialVentasByUser,
  getDetalleVentaHistorial,
} = require("../controllers/HistorialVentasController");

// Rutas protegidas para el historial de ventas (clientes)
router.get("/historial-ventas", authenticateToken, checkRole([3]), getHistorialVentasByUser);
router.get("/historial-ventas/:id/detalles", authenticateToken, checkRole([3]), getDetalleVentaHistorial);

module.exports = router;
