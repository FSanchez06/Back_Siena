const express = require("express");
const router = express.Router();
const { 
    createProduct, 
    getAllProducts, 
    getProductById, 
    updateProduct, 
    updateProductImage, 
    deleteProduct, 
    getProductsByColor, 
    toggleInsignia, 
    updateProductState, 
    addStock, 
    removeStock, 
    updateStockMinimo 
} = require("../controllers/ProductosController");
const { authenticateToken } = require("../Middlewares/authMiddleware");
const { checkRole } = require("../Middlewares/roleMiddleware");

//Crear un producto Admin o Empleado
router.post("/productos", authenticateToken, checkRole([1, 2]), createProduct);

//Consultar todos los productos
router.get("/productos", getAllProducts);

//Conosultar productos por id
router.get("/productos/:id", getProductById);

//Actualziar datos de un producto
router.put("/productos/:id", authenticateToken, checkRole([1, 2]), updateProduct);

//Actualizar imagen de un producto
router.put("/productos/:id/image", authenticateToken, checkRole([1, 2]), updateProductImage);

//Eliminar producto
router.delete("/productos/:id", authenticateToken, checkRole([1, 2]), deleteProduct);

//Consultar productos por color
router.get("/productos/color/:color", getProductsByColor);

//Activar o Desactivar Insignia del producto
router.put("/productos/:id/insignia", authenticateToken, checkRole([1, 2]), toggleInsignia);

//Actualizar estado del producto
router.put("/productos/:id/status", authenticateToken, checkRole([1, 2]), updateProductState);

//Agregar stock a un producto
router.put("/productos/:id/add-stock", authenticateToken, checkRole([1, 2]), addStock);

//Eliminar stock de un producto
router.put("/productos/:id/remove-stock", authenticateToken, checkRole([1, 2]), removeStock);

//Actualizar Stock minimo
router.put("/productos/:id/stock-min", authenticateToken, checkRole([1, 2]), updateStockMinimo);

module.exports = router;

