const cloudinary = require("cloudinary").v2;

module.exports = {

    //Crear nueva imagen promocional
    createImage: (req, res) => {
        if (!req.files || !req.files.ImageHome) {
            return res.status(400).send("No se ha subido ninguna imagen.");
        }

        const promoImage = req.files.ImageHome; // Imagen cargada
        const userId = req.body.ID_Usuario || req.userId; // ID del usuario autenticado

        if (!userId) {
            return res.status(400).send("Se requiere un ID de usuario válido.");
        }

        req.getConnection((err, conn) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Error de conexion con la base de datos.");
            }

            //Subir la imagen a Cloudinary en la carpeta Promos
            cloudinary.uploader.upload(promoImage.tempFilePath, { folder: "Promos"}, (err, result) => {
                if (err) {
                    console.error(error);
                    return res.status(500).send("Error al subir la imagen a Cloudinary.");
                }

                const newImage = {
                    ImageHome: result.secure_url,
                    PublicId: result.public_id,
                    ID_Usuario: userId
                };

                //Insertar en la base de datos
                conn.query("INSERT INTO Images SET ?", [newImage], (err) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).send("Error al insertar la imagen en la base de datos.");
                    }
                    res.status(201).send("Imagen promocional creada correctamente.");
                });
            });
        });
    },

    //Actualizar imagen promocional
    updateImage: (req, res) => {
        const imageId = req.params.id;

        req.getConnection((err, conn) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Error de conexión a la base de datos.");
            }

            //Consular la imagen actual
            conn.query("SELECT * FROM Images WHERE ID_Image = ?", [imageId], (err, rows) => {
                if (err || rows.length === 0) {
                    return res.status(404).send("Imagen no encontrada.");
                }

                const oldImage = rows[0];
                const oldPublicId = oldImage.PublicId;

                //Eliminar la imagen anterior de cloudinary
                const deleteOldImage = oldPublicId ? cloudinary.uploader.destroy(oldPublicId) : Promise.resolve();

                deleteOldImage
                .then(() => {
                    if (!req.files || !req.files.ImageHome) {
                        return res.status(400).send("No se ha subido una nueva imagen para actualizar.");
                    }

                    const newPromoImage = req.files.ImageHome;

                    //Subir la nueva imagen a cloudinary
                    cloudinary.uploader.upload(newPromoImage.tempFilePath, { folder: "Promos" }, (err, result) => {
                        if (err) {
                            console.error(error);
                            return res.status(500).send("Error al subir la nueva imagen a Cloudinary.");
                        }

                        const updatedData = {
                            ImageHome: result.secure_url,
                            PublicId: result.public_id
                        };

                        // Actualizar la base de datos
                        conn.query("UPDATE Images SET ? WHERE ID_Image = ?", [updatedData, imageId], (err) => {
                            if (err) {
                                console.error(err);
                                return res.status(500).send("Error al actualizar la imagen en la base de datos.");
                            }
                            res.send("Imagen promocional actualizada correctamente.");
                        });
                    });
                })
                .catch((err) => {
                    console.error(error);
                    res.status(500).send("Error al eliminar la imagen anterior de Cloudinary.");
                });
            });
        });
    },

    //Obtener todas las imagenes promocionales
    getAllImages: (req, res) => {
        req.getConnection((err, conn) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Error de conexión a la base de datos.");
            }

            conn.query("SELECT * FROM Images", (err, rows) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send("Error al obtener las imágenes.");
                }
                res.json(rows);
            });
        });
    }
};