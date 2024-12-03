// roleMiddleware.js
const checkRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.userRole)) {
            return res.status(403).send("Acceso denegado: No tienes permiso para acceder a esta ruta.");
        }
        next();
    };
};

module.exports = { checkRole };
