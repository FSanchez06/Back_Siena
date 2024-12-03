const express = require("express");
const router = express.Router();
const { checkRole } = require("../Middlewares/roleMiddleware");
const { authenticateToken } = require("../Middlewares/authMiddleware");
const { createImage, updateImage, getAllImages } = require("../controllers/ImagesController");

//Crear una nueva imagen promocional (Admin o Empleado)
router.post("/images", authenticateToken, checkRole([1, 2]), createImage);

//Actualizar una imagen promocional (Admin o Empleado)
router.put("/:id/images", authenticateToken, checkRole([1, 2]), updateImage);

//Obtener todas las imagenes promocionales
router.get("/images", getAllImages);

module.exports = router;