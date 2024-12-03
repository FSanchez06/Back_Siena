const express = require("express");
const router = express.Router();
const { 
    createMessage, 
    getMyMessages, 
    getAllMessages, 
    updateMessage, 
    deleteMessage, 
    respondToMessage 
} = require("../controllers/MensajesController");
const { authenticateToken, authenticateTokenOptional } = require("../Middlewares/authMiddleware");
const { checkRole } = require("../Middlewares/roleMiddleware");

// Rutas públicas
router.post("/mensajes", authenticateTokenOptional, createMessage); // Crear un mensaje (abierto a todos)

// Rutas protegidas
router.get("/mensajes/mios", authenticateToken, checkRole([3]), getMyMessages); // Consultar mensajes propios (Clientes)
router.put("/mensajes/:id", authenticateToken, checkRole([3]), updateMessage); // Actualizar mensaje propio
router.delete("/mensajes/:id", authenticateToken, checkRole([3]), deleteMessage); // Eliminar mensaje propio

// Rutas administrativas
router.get("/mensajes", authenticateToken, checkRole([1, 2]), getAllMessages); // Consultar todos los mensajes (Administrador)
router.delete("/mensajes/admin/:id", authenticateToken, checkRole([1, 2]), deleteMessage); // Eliminar mensaje (Administrador)
router.post("/mensajes/responder/:id", authenticateToken, checkRole([1, 2]), respondToMessage); // Responder un mensaje (Administrador)

module.exports = router;
