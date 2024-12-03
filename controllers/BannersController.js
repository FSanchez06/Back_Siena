// Importar Cloudinary
const cloudinary = require("cloudinary").v2;

module.exports = {
    // Función para crear un nuevo banner
    createBanner: (req, res) => {
        // Verificación de que se ha subido una imagen
        if (!req.files || !req.files.ImgBanner) {
            return res.status(400).send("No se ha subido ninguna imagen.");
        }

        const bannerImage = req.files.ImgBanner; // Imagen cargada
        const userId = req.body.ID_Usuario || req.userId;  // ID del usuario que está creando el banner

        // Validación de que se ha proporcionado un ID de usuario
        if (!userId) {
            return res.status(400).send("Se requiere un ID de usuario válido.");
        }

        // Conexión a la base de datos
        req.getConnection((err, conn) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Error de conexión a la base de datos.");
            }

            // Subida de la imagen a Cloudinary en la carpeta "Banners"
            cloudinary.uploader.upload(bannerImage.tempFilePath, { folder: "Banners" }, (error, result) => {
                if (error) {
                    console.error(error);
                    return res.status(500).send("Error al subir la imagen a Cloudinary");
                }

                // Creación de objeto con los datos del nuevo banner
                const newBanner = {
                    ImgBanner: result.secure_url, // URL segura de la imagen en Cloudinary
                    PublicId: result.public_id,   // ID público de la imagen en Cloudinary
                    ID_Usuario: userId            // ID del usuario que crea el banner
                };

                // Inserción del nuevo banner en la base de datos
                conn.query("INSERT INTO Banners SET ?", [newBanner], (err) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).send("Error al insertar el banner en la base de datos.");
                    }
                    res.status(201).send("Banner creado correctamente");
                });
            });
        });
    },

    // Función para actualizar un banner existente
    updateBanner: (req, res) => {
        const bannerId = req.params.id; // ID del banner a actualizar

        // Conexión a la base de datos
        req.getConnection((err, conn) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Error de conexión a la base de datos.");
            }

            // Obtener `PublicId` de la imagen existente en Cloudinary para eliminarla
            conn.query("SELECT PublicId FROM Banners WHERE ID_Banner = ?", [bannerId], (err, rows) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send("Error al obtener el banner.");
                }
                if (rows.length === 0) return res.status(404).send("Banner no encontrado.");

                const oldPublicId = rows[0].PublicId; // ID de imagen anterior en Cloudinary

                // Eliminar imagen anterior de Cloudinary si existe
                const deleteOldImage = oldPublicId ? cloudinary.uploader.destroy(oldPublicId) : Promise.resolve();

                deleteOldImage
                    .then(() => {
                        // Crear objeto para la actualización del banner
                        const updatedBanner = {};

                        // Si se sube una nueva imagen, subirla a Cloudinary
                        if (req.files && req.files.ImgBanner) {
                            cloudinary.uploader.upload(req.files.ImgBanner.tempFilePath, { folder: "Banners" })
                                .then((result) => {
                                    // Asignar los nuevos valores de imagen al objeto `updatedBanner`
                                    updatedBanner.ImgBanner = result.secure_url;
                                    updatedBanner.PublicId = result.public_id;

                                    // Actualizar el banner en la base de datos con los nuevos valores de imagen
                                    conn.query("UPDATE Banners SET ? WHERE ID_Banner = ?", [updatedBanner, bannerId], (err) => {
                                        if (err) {
                                            console.error(err);
                                            return res.status(500).send("Error al actualizar el banner en la base de datos.");
                                        }
                                        res.send("Banner actualizado correctamente.");
                                    });
                                })
                                .catch(error => {
                                    console.error(error);
                                    res.status(500).send("Error al subir la nueva imagen a Cloudinary");
                                });
                        } else {
                            // Si no hay una nueva imagen, solo se envía un mensaje sin cambios
                            res.send("No se ha proporcionado una nueva imagen para actualizar.");
                        }
                    })
                    .catch(error => {
                        console.error(error);
                        res.status(500).send("Error al eliminar la imagen anterior de Cloudinary");
                    });
            });
        });
    },

    // Función para obtener todos los banners
    getBanners: (req, res) => {
        // Conexión a la base de datos
        req.getConnection((err, conn) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Error de conexión a la base de datos.");
            }

            // Consultar todos los banners en la base de datos
            conn.query("SELECT * FROM Banners", (err, rows) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send("Error al obtener los banners.");
                }
                res.json(rows); // Enviar la lista de banners en formato JSON
            });
        });
    }
};
