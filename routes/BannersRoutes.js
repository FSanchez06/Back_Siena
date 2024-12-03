const express = require("express");
const router = express.Router();
const { createBanner, updateBanner, getBanners } = require("../controllers/BannersController");
const { authenticateToken } = require("../Middlewares/authMiddleware");
const { checkRole } = require("../Middlewares/roleMiddleware");

// Rutas de banners protegidas por autenticación y rol de administrador
// Crear un nuevo banner (solo Admin)
router.post("/banners", authenticateToken, checkRole([1]), createBanner);

// Actualizar un banner existente (solo Admin)
router.put("/banners/:id", authenticateToken, checkRole([1]), updateBanner);

// Obtener todos los banners (solo Admin)
router.get("/banners", getBanners);

module.exports = router;
