const cloudinary = require("cloudinary").v2;

module.exports = {
    // Crear un nuevo producto
    createProduct: (req, res) => {
        if (!req.files || !req.files.ImgProducto) {
            return res.status(400).send("La imagen del producto es requerida.");
        }

        const productImage = req.files.ImgProducto; // Imagen cargada
        const {
            NombreProducto,
            PrecioProducto,
            Color,
            Descripcion,
            StockDisponible,
            StockMinimo,
            Insignia,
            ID_Usuario
        } = req.body;

        req.getConnection((err, conn) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Error de conexión a la base de datos.");
            }

            // Subir imagen a Cloudinary
            cloudinary.uploader.upload(productImage.tempFilePath, { folder: "Products" }, (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send("Error al subir la imagen a Cloudinary.");
                }

                const newProduct = {
                    ImgProducto: result.secure_url,
                    PublicId: result.public_id,
                    NombreProducto,
                    PrecioProducto,
                    Color,
                    Descripcion,
                    StockDisponible,
                    StockMinimo,
                    Insignia,
                    Estado: "Disponible",
                    ID_Usuario
                };

                // Insertar producto en la base de datos
                conn.query("INSERT INTO Productos SET ?", [newProduct], (err) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).send("Error al crear el producto.");
                    }
                    res.status(201).send("Producto creado exitosamente.");
                });
            });
        });
    },

    // Consultar todos los productos
    getAllProducts: (req, res) => {
        req.getConnection((err, conn) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Error de conexión a la base de datos.");
            }

            conn.query("SELECT * FROM Productos", (err, rows) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send("Error al obtener los productos.");
                }
                res.json(rows);
            });
        });
    },

    // Consultar producto por ID
    getProductById: (req, res) => {
        const { id } = req.params;

        req.getConnection((err, conn) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Error de conexión a la base de datos.");
            }

            conn.query("SELECT * FROM Productos WHERE ID_Producto = ?", [id], (err, rows) => {
                if (err || rows.length === 0) {
                    return res.status(404).send("Producto no encontrado.");
                }
                res.json(rows[0]);
            });
        });
    },

    // Actualizar datos de un producto
    updateProduct: (req, res) => {
        const { id } = req.params;
        const updatedData = req.body;

        req.getConnection((err, conn) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Error de conexión a la base de datos.");
            }

            conn.query("UPDATE Productos SET ? WHERE ID_Producto = ?", [updatedData, id], (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send("Error al actualizar el producto.");
                }
                res.send("Producto actualizado exitosamente.");
            });
        });
    },

    // Actualizar imagen del producto
    updateProductImage: (req, res) => {
        const { id } = req.params;

        if (!req.files || !req.files.ImgProducto) {
            return res.status(400).send("La nueva imagen del producto es requerida.");
        }

        const newImage = req.files.ImgProducto;

        req.getConnection((err, conn) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Error de conexión a la base de datos.");
            }

            // Consultar producto actual para obtener PublicId de la imagen antigua
            conn.query("SELECT PublicId FROM Productos WHERE ID_Producto = ?", [id], (err, rows) => {
                if (err || rows.length === 0) {
                    return res.status(404).send("Producto no encontrado.");
                }

                const oldPublicId = rows[0].PublicId;

                // Eliminar la imagen antigua de Cloudinary
                cloudinary.uploader.destroy(oldPublicId, (err) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).send("Error al eliminar la imagen anterior de Cloudinary.");
                    }

                    // Subir nueva imagen a Cloudinary
                    cloudinary.uploader.upload(newImage.tempFilePath, { folder: "Products" }, (err, result) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).send("Error al subir la nueva imagen a Cloudinary.");
                        }

                        const updatedImage = {
                            ImgProducto: result.secure_url,
                            PublicId: result.public_id
                        };

                        // Actualizar base de datos con la nueva imagen
                        conn.query("UPDATE Productos SET ? WHERE ID_Producto = ?", [updatedImage, id], (err) => {
                            if (err) {
                                console.error(err);
                                return res.status(500).send("Error al actualizar la imagen del producto.");
                            }
                            res.send("Imagen del producto actualizada exitosamente.");
                        });
                    });
                });
            });
        });
    },

    // Eliminar un producto
    deleteProduct: (req, res) => {
        const { id } = req.params;

        req.getConnection((err, conn) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Error de conexión a la base de datos.");
            }

            // Consultar PublicId de la imagen para eliminarla de Cloudinary
            conn.query("SELECT PublicId FROM Productos WHERE ID_Producto = ?", [id], (err, rows) => {
                if (err || rows.length === 0) {
                    return res.status(404).send("Producto no encontrado.");
                }

                const publicId = rows[0].PublicId;

                // Eliminar imagen de Cloudinary
                cloudinary.uploader.destroy(publicId, (err) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).send("Error al eliminar la imagen de Cloudinary.");
                    }

                    // Eliminar producto de la base de datos
                    conn.query("DELETE FROM Productos WHERE ID_Producto = ?", [id], (err) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).send("Error al eliminar el producto.");
                        }
                        res.send("Producto eliminado exitosamente.");
                    });
                });
            });
        });
    },

    // Consultar productos por color
    getProductsByColor: (req, res) => {
        const { color } = req.params;

        req.getConnection((err, conn) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Error de conexión a la base de datos.");
            }

            conn.query("SELECT * FROM Productos WHERE Color = ?", [color], (err, rows) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send("Error al consultar productos por color.");
                }

                res.json(rows);
            });
        });
    },

    // Activar o desactivar insignia
    toggleInsignia: (req, res) => {
        const { id } = req.params;
        let { insignia } = req.body; // Recibir el valor de insignia
    
        // Asegurarse de que el valor sea explícitamente 1 o 0
        insignia = insignia ? 1 : 0;
    
        req.getConnection((err, conn) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Error de conexión a la base de datos.");
            }
    
            conn.query("UPDATE Productos SET Insignia = ? WHERE ID_Producto = ?", [insignia, id], (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send("Error al actualizar la insignia del producto.");
                }
    
                res.send(`Insignia ${insignia === 1 ? "activada" : "desactivada"} exitosamente.`);
            });
        });
    },
    
    // Actualizar estado del producto
    updateProductState: (req, res) => {
        const { id } = req.params;
        const { estado } = req.body; // "Disponible", "Agotado", "En Reposición" o "Descontinuado"

        req.getConnection((err, conn) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Error de conexión a la base de datos.");
            }

            conn.query("UPDATE Productos SET Estado = ? WHERE ID_Producto = ?", [estado, id], (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send("Error al actualizar el estado del producto.");
                }

                res.send("Estado del producto actualizado exitosamente.");
            });
        });
    },

    // Agregar stock
    addStock: (req, res) => {
        const { id } = req.params;
        const { cantidad } = req.body; // Cantidad a agregar
        const userId = req.userId; // ID del usuario que realiza el cambio
    
        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");
    
            // Obtener el stock actual antes de actualizarlo
            conn.query("SELECT StockDisponible FROM Productos WHERE ID_Producto = ?", [id], (err, results) => {
                if (err || results.length === 0) {
                    return res.status(404).send("Producto no encontrado.");
                }
    
                const stockActual = results[0].StockDisponible;
    
                // Actualizar el stock disponible
                conn.query(
                    "UPDATE Productos SET StockDisponible = StockDisponible + ? WHERE ID_Producto = ?",
                    [cantidad, id],
                    (err) => {
                        if (err) return res.status(500).send("Error al agregar stock.");
    
                        // Registrar el cambio en el historial
                        const nuevoHistorial = {
                            ID_Producto: id,
                            Cambio: "Incremento de Stock",
                            Cantidad: cantidad,
                            FechaCambio: new Date(),
                            ID_Usuario: userId || null,
                        };
    
                        conn.query("INSERT INTO HistorialStock SET ?", [nuevoHistorial], (err) => {
                            if (err) return res.status(500).send("Error al registrar el historial de stock.");
                            res.send(`Stock incrementado en ${cantidad} unidades y registrado en el historial.`);
                        });
                    }
                );
            });
        });
    },
    

    // Eliminar stock
    removeStock: (req, res) => {
        const { id } = req.params;
        const { cantidad } = req.body; // Cantidad a reducir
        const userId = req.userId; // ID del usuario que realiza el cambio
    
        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");
    
            // Obtener el stock actual antes de actualizarlo
            conn.query("SELECT StockDisponible FROM Productos WHERE ID_Producto = ?", [id], (err, results) => {
                if (err || results.length === 0) {
                    return res.status(404).send("Producto no encontrado.");
                }
    
                const stockActual = results[0].StockDisponible;
    
                // Validar que el stock no quede negativo
                if (stockActual - cantidad < 0) {
                    return res.status(400).send("El stock no puede ser menor a 0.");
                }
    
                // Actualizar el stock disponible
                conn.query(
                    "UPDATE Productos SET StockDisponible = StockDisponible - ? WHERE ID_Producto = ?",
                    [cantidad, id],
                    (err) => {
                        if (err) return res.status(500).send("Error al reducir stock.");
    
                        // Registrar el cambio en el historial
                        const nuevoHistorial = {
                            ID_Producto: id,
                            Cambio: "Reducción de Stock",
                            Cantidad: -cantidad,
                            FechaCambio: new Date(),
                            ID_Usuario: userId || null,
                        };
    
                        conn.query("INSERT INTO HistorialStock SET ?", [nuevoHistorial], (err) => {
                            if (err) return res.status(500).send("Error al registrar el historial de stock.");
                            res.send(`Stock reducido en ${cantidad} unidades y registrado en el historial.`);
                        });
                    }
                );
            });
        });
    },
    

    // Actualizar stock mínimo
    updateStockMinimo: (req, res) => {
        const { id } = req.params;
        const { stockMinimo } = req.body; // Nuevo stock mínimo

        req.getConnection((err, conn) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Error de conexión a la base de datos.");
            }

            conn.query(
                "UPDATE Productos SET StockMinimo = ? WHERE ID_Producto = ?",
                [stockMinimo, id],
                (err) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).send("Error al actualizar el stock mínimo.");
                    }

                    res.send("Stock mínimo actualizado exitosamente.");
                }
            );
        });
    }

};
