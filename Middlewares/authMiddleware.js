// authMiddleware.js
const jwt = require("jsonwebtoken");
require("dotenv").config();

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Extraer solo el token
    
    // Validar presencia del token
    if (!token) return res.status(403).send("Token requerido.");

    // Verificar el token JWT
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).send("Token inválido.");
        req.userId = decoded.userId;
        req.userRole = decoded.userRole;
        next();
    });
};

const authenticateTokenOptional = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Extraer solo el token

    if (!token) {
        // Si no hay token, pasa al siguiente middleware sin asignar userId
        req.userId = null;
        return next();
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            req.userId = null; // Token inválido, lo tratamos como no logueado
            return next();
        }
        req.userId = decoded.userId;
        next();
    });
};


module.exports = { authenticateToken, authenticateTokenOptional };




