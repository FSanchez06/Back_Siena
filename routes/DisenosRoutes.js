const express = require("express");
const router = express.Router();
const { 
    createDiseno, 
    getMisDisenos, 
    getAllDisenos, 
    updateDiseno, 
    changeEstadoDiseno, 
    deleteDiseno 
} = require("../controllers/DisenosController");
const { authenticateToken } = require("../Middlewares/authMiddleware");
const { checkRole } = require("../Middlewares/roleMiddleware");

// Crear/guardar un diseño personalizado (Cliente)
router.post("/disenos", authenticateToken, createDiseno);

// Consultar mis diseños personalizados (Cliente)
router.get("/disenos/mis-disenos", authenticateToken, getMisDisenos);

// Consultar todos los diseños personalizados (Administrador o Empleado)
router.get("/disenos", authenticateToken, checkRole([1, 2]), getAllDisenos);

// Actualizar información del diseño (Cliente)
router.put("/disenos/:id", authenticateToken, updateDiseno);

// Cambiar estado del diseño (Administrador o Empleado)
router.put("/disenos/:id/estado", authenticateToken, checkRole([1, 2]), changeEstadoDiseno);

// Eliminar diseño personalizado (Cliente)
router.delete("/disenos/:id", authenticateToken, deleteDiseno);

module.exports = router;
