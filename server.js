require("dotenv").config(); // Carga las variables de entorno
const express = require("express");
const mysql = require("mysql2");
const myconn = require("express-myconnection");
const fileUpload = require("express-fileupload");
const cloudinary = require("cloudinary").v2;
const path = require("path");
const cors = require("cors");

const bannersRoutes = require("./routes/BannersRoutes");
const rolRoutes = require("./routes/Rolroutes");
const userRoutes = require("./routes/Usuarioroutes");
const imagesRoutes = require("./routes/ImagesRoutes");
const productsRoutes = require("./routes/ProductosRoutes");
const mensajesRoutes = require("./routes/MensajesRoutes");
const metodopagoRoutes = require("./routes/MetodoPagoRoutes");
const pedidosRoutes = require("./routes/PedidosRoutes");
const detallesRoutes = require("./routes/DetallesPedidoRoutes");
const ventasRoutes = require("./routes/VentasRoutes");
const disenosRoutes = require("./routes/DisenosRoutes");
const historialpedidosRoutes = require("./routes/HistorialPedidosRoutes")
const historialventasRoutes = require("./routes/HistorialVentasRoutes");

const { authenticateToken } = require("./Middlewares/authMiddleware"); // Autenticación JWT
const app = express();
app.set("port", process.env.PORT || 9000);

// Configuración de la base de datos
const dbOptions = {
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: "",
    database: "siena"
};
//local
// Configuración de Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Middlewares
app.use(myconn(mysql, dbOptions, 'single')); // Conexión a la base de datos
app.use(express.json()); // Permite recibir datos en formato JSON
app.use(fileUpload({ useTempFiles: true, tempFileDir: path.join(__dirname, "tmp/") }));
app.use(cors());

// Ruta principal para verificación de conexión
app.get("/api", (req, res) => {
    res.send("Bienvenido a la API de Siena");
});

// Rutas protegidas para gestión de banners, roles y usuarios
app.use("/api", bannersRoutes); // Ruta para banners
app.use("/api", rolRoutes); // Ruta para roles
app.use("/api", userRoutes); // Ruta para usuarios
app.use("/api", imagesRoutes); //Rutas para Imagenes promocionales
app.use("/api", productsRoutes); //Rutas para los productos
app.use("/api", mensajesRoutes); //Rutas para mensajes
app.use("/api", metodopagoRoutes); //Rutas para metododepago
app.use("/api", pedidosRoutes); //Rutas para pedidos
app.use("/api", detallesRoutes); //Ruta para detalles de los pedidos
app.use("/api", ventasRoutes); //Ruta para ventas
app.use("/api", disenosRoutes); //Rutas para los diseños
app.use("/api", historialpedidosRoutes) //Rutas para historial pedidos
app.use("/api", historialventasRoutes) //Rutas para historial ventas

// Iniciar el servidor
app.listen(app.get("port"), () => {
    console.log(`Servidor corriendo en el puerto ${app.get("port")}`);
});
