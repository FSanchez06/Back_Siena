const express = require("express");
const router = express.Router();
const { getHistorialStock } = require("../controllers/HistorialStockController");
const { authenticateToken } = require("../Middlewares/authMiddleware");
const { checkRole } = require("../Middlewares/roleMiddleware");

// Rutas para el historial de stock
router.get("/historial-stock", authenticateToken, checkRole([1, 2]), getHistorialStock); // Para obtener todo el historial
router.get("/historial-stock/:ID_Producto", authenticateToken, checkRole([1, 2]), getHistorialStock); // Para filtrar por producto

module.exports = router;
