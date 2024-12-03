const cloudinary = require("cloudinary").v2;

module.exports = {
    // Crear/guardar un diseño personalizado
    createDiseno: (req, res) => {
        const userId = req.userId;
        const { NombreDisenio, Descripcion } = req.body;

        if (!req.files || !req.files.Modelo3D) {
            return res.status(400).send("Debe proporcionar un modelo 3D.");
        }

        const modelo3D = req.files.Modelo3D;

        // Subir el modelo a Cloudinary
        cloudinary.uploader.upload(
            modelo3D.tempFilePath, 
            { folder: "Customizations" }, 
            (error, result) => {
                if (error) {
                    return res.status(500).send("Error al subir el modelo 3D a Cloudinary.");
                }

                // Guardar el diseño en la base de datos
                const newDiseno = {
                    ID_Usuario: userId,
                    NombreDisenio,
                    Descripcion,
                    Modelo3DURL: result.secure_url,
                    PublicId: result.public_id,
                };

                req.getConnection((err, conn) => {
                    if (err) return res.status(500).send("Error de conexión a la base de datos.");
                    
                    conn.query("INSERT INTO DisenosPersonalizados SET ?", [newDiseno], (err) => {
                        if (err) return res.status(500).send("Error al guardar el diseño personalizado.");
                        res.status(201).send("Diseño personalizado creado exitosamente.");
                    });
                });
            }
        );
    },

    // Consultar mis diseños personalizados
    getMisDisenos: (req, res) => {
        const userId = req.userId;

        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");

            conn.query(`SELECT 
                    ID_Disenio,
                    NombreDisenio,
                    Descripcion,
                    FechaCreacion,
                    Estado,
                    Modelo3DURL,
                    Precio,
                    Justificacion
                FROM 
                    DisenosPersonalizados
                WHERE 
                    ID_Usuario = ?
            `, [userId], (err, rows) => {
                if (err) return res.status(500).send("Error al obtener los diseños personalizados.");
                res.json(rows);
            });
        });
    },

    // Consultar todos los diseños personalizados
    getAllDisenos: (req, res) => {
        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");

            conn.query("SELECT * FROM DisenosPersonalizados", (err, rows) => {
                if (err) return res.status(500).send("Error al obtener los diseños personalizados.");
                res.json(rows);
            });
        });
    },

    // Actualizar información del diseño personalizado
    updateDiseno: (req, res) => {
        const disenoId = req.params.id;
        const userId = req.userId;
        const { NombreDisenio, Descripcion } = req.body;

        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");

            conn.query(
                `UPDATE DisenosPersonalizados 
                SET NombreDisenio = ?, Descripcion = ? 
                WHERE ID_Disenio = ? AND ID_Usuario = ?`,
                [NombreDisenio, Descripcion, disenoId, userId],
                (err, result) => {
                    if (err || result.affectedRows === 0) {
                        return res.status(404).send("Diseño no encontrado o no autorizado.");
                    }
                    res.send("Diseño personalizado actualizado correctamente.");
                }
            );
        });
    },

    // Cambiar estado del diseño personalizado
    changeEstadoDiseno: (req, res) => {
        const disenoId = req.params.id;
        const { Estado } = req.body;

        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");

            conn.query(
                "UPDATE DisenosPersonalizados SET Estado = ? WHERE ID_Disenio = ?", 
                [Estado, disenoId], 
                (err) => {
                    if (err) return res.status(500).send("Error al cambiar el estado del diseño personalizado.");
                    res.send("Estado del diseño personalizado cambiado correctamente.");
                }
            );
        });
    },

    // Eliminar diseño personalizado
    deleteDiseno: (req, res) => {
        const disenoId = req.params.id;
        const userId = req.userId;

        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");

            conn.query(
                "SELECT PublicId FROM DisenosPersonalizados WHERE ID_Disenio = ? AND ID_Usuario = ?",
                [disenoId, userId],
                (err, rows) => {
                    if (err || rows.length === 0) {
                        return res.status(404).send("Diseño no encontrado o no autorizado.");
                    }

                    const publicId = rows[0].PublicId;

                    cloudinary.uploader.destroy(publicId, (error) => {
                        if (error) return res.status(500).send("Error al eliminar el modelo 3D de Cloudinary.");

                        conn.query(
                            "DELETE FROM DisenosPersonalizados WHERE ID_Disenio = ? AND ID_Usuario = ?",
                            [disenoId, userId],
                            (err) => {
                                if (err) return res.status(500).send("Error al eliminar el diseño personalizado.");
                                res.send("Diseño personalizado eliminado correctamente.");
                            }
                        );
                    });
                }
            );
        });
    },
};
