module.exports = {
    // Crear los detalles del pedido automáticamente
    createOrderDetails: (req, res) => {
        const pedidoId = req.params.id;
        const { Detalles } = req.body;
        const userId = req.userId;

        if (!Detalles || Detalles.length === 0) {
            return res.status(400).send("El pedido debe contener al menos un detalle.");
        }

        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");

            // Verificar que el pedido existe y pertenece al usuario
            conn.query("SELECT Estado, ID_Usuario FROM Pedidos WHERE ID_Pedido = ?", [pedidoId], (err, results) => {
                if (err || results.length === 0) return res.status(404).send("Pedido no encontrado.");
                const pedido = results[0];

                if (pedido.ID_Usuario !== userId) {
                    return res.status(403).send("No tienes permiso para modificar este pedido.");
                }

                // Verificar que el pedido esté en estado "Por pagar"
                if (pedido.Estado !== "Por pagar") {
                    return res.status(400).send("Solo puedes agregar detalles a un pedido en estado 'Por pagar'.");
                }

                // Iniciar transacción para crear el pedido y los detalles
                conn.beginTransaction((err) => {
                    if (err) return res.status(500).send("Error al iniciar la transacción.");

                    // Crear los detalles del pedido
                    const detallesQuery = Detalles.map((detalle) => [
                        pedidoId,
                        detalle.ID_Producto,
                        detalle.Cantidad,
                        detalle.PrecioUnitario
                    ]);

                    conn.query(
                        "INSERT INTO DetallesPedido (ID_Pedido, ID_Producto, Cantidad, PrecioUnitario) VALUES ?",
                        [detallesQuery],
                        (err) => {
                            if (err) {
                                conn.rollback();
                                return res.status(500).send("Error al crear los detalles del pedido.");
                            }

                            // Actualizar el total del pedido
                            conn.query(
                                "UPDATE Pedidos SET Total = (SELECT SUM(Cantidad * PrecioUnitario) FROM DetallesPedido WHERE ID_Pedido = ?) WHERE ID_Pedido = ?",
                                [pedidoId, pedidoId],
                                (err) => {
                                    if (err) {
                                        conn.rollback();
                                        return res.status(500).send("Error al actualizar el total del pedido.");
                                    }

                                    conn.commit((err) => {
                                        if (err) {
                                            conn.rollback();
                                            return res.status(500).send("Error al confirmar la transacción.");
                                        }

                                        res.status(201).send("Detalles del pedido creados y total actualizado.");
                                    });
                                }
                            );
                        }
                    );
                });
            });
        });
    },

    // Actualizar la cantidad de un producto en los detalles de un pedido
    updateOrderQuantity: (req, res) => {
        const pedidoId = req.params.id;
        const { Detalles } = req.body;

        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");

            conn.query(
                "SELECT Estado FROM Pedidos WHERE ID_Pedido = ?",
                [pedidoId],
                (err, results) => {
                    if (err || results.length === 0) {
                        return res.status(404).send("Pedido no encontrado.");
                    }

                    const pedido = results[0];
                    if (pedido.Estado !== "Por pagar") {
                        return res.status(400).send("Solo puedes modificar cantidades para pedidos 'Por pagar'.");
                    }

                    const updatePromises = Detalles.map((detalle) => {
                        return new Promise((resolve, reject) => {
                            conn.query(
                                "SELECT StockDisponible FROM Productos WHERE ID_Producto = ?",
                                [detalle.ID_Producto],
                                (err, rows) => {
                                    if (err || rows.length === 0) return reject("Producto no encontrado.");
                                    const stockDisponible = rows[0].StockDisponible;

                                    if (detalle.Cantidad > stockDisponible) {
                                        return reject(`Stock insuficiente para el producto ${detalle.ID_Producto}.`);
                                    }

                                    conn.query(
                                        "UPDATE DetallesPedido SET Cantidad = ? WHERE ID_Pedido = ? AND ID_Producto = ?",
                                        [detalle.Cantidad, pedidoId, detalle.ID_Producto],
                                        (err) => {
                                            if (err) return reject("Error al actualizar el detalle.");
                                            resolve();
                                        }
                                    );
                                }
                            );
                        });
                    });

                    Promise.all(updatePromises)
                        .then(() => {
                            conn.query(
                                "UPDATE Pedidos SET Total = (SELECT SUM(Cantidad * PrecioUnitario) FROM DetallesPedido WHERE ID_Pedido = ?) WHERE ID_Pedido = ?",
                                [pedidoId, pedidoId],
                                (err) => {
                                    if (err) return res.status(500).send("Error al actualizar el total del pedido.");
                                    res.send("Cantidades actualizadas correctamente.");
                                }
                            );
                        })
                        .catch((err) => {
                            res.status(500).send(err);
                        });
                }
            );
        });
    },

    // Obtener detalles de un pedido (Admin, Empleado, Cliente propietario)
    getOrderDetailsById: (req, res) => {
        const pedidoId = req.params.id; // ID del pedido recibido en la URL
        const userId = req.userId; // ID del usuario autenticado
        const userRole = req.userRole; // Rol del usuario autenticado
    
        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");
            conn.query(
                `SELECT 
                    dp.ID_Detalle, 
                    dp.ID_Pedido, 
                    dp.ID_Producto, 
                    p.NombreProducto AS NombreProducto, 
                    p.ImgProducto AS ImgProducto, 
                    dp.Cantidad, 
                    dp.PrecioUnitario, 
                    dp.Subtotal
                FROM DetallesPedido dp
                LEFT JOIN Productos p ON dp.ID_Producto = p.ID_Producto
                WHERE dp.ID_Pedido = ?`,
                [pedidoId],
                (err, results) => {
                    if (err) {
                        return res.status(500).send("Error al obtener detalles del pedido.");
                    }
                    if (results.length === 0) {
                        return res.status(404).send("Detalles del pedido no encontrados.");
                    }
                    // Verificar si el usuario tiene permiso para ver los detalles
                    if (userRole === 3) {
                        conn.query(
                            "SELECT ID_Usuario FROM Pedidos WHERE ID_Pedido = ?",
                            [pedidoId],
                            (err, rows) => {
                                if (err || rows.length === 0 || rows[0].ID_Usuario !== userId) {
                                    return res.status(403).send("No tienes permiso para ver este pedido.");
                                }
                                res.json(results);
                            }
                        );
                    } else {
                        res.json(results); // Admin y Empleado pueden ver todos los detalles
                    }
                }
            );
        });
    },    

    // Obtener detalles de los pedidos de un usuario (solo los propios pedidos del cliente)
    getUserOrderDetails: (req, res) => {
        const userId = req.userId;

        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");

            conn.query(
                "SELECT * FROM Pedidos WHERE ID_Usuario = ?",
                [userId],
                (err, orders) => {
                    if (err) return res.status(500).send("Error al obtener los pedidos.");
                    if (orders.length === 0) return res.status(404).send("No tienes pedidos.");

                    const orderIds = orders.map((order) => order.ID_Pedido);
                    conn.query(
                        "SELECT * FROM DetallesPedido WHERE ID_Pedido IN (?)",
                        [orderIds],
                        (err, details) => {
                            if (err) return res.status(500).send("Error al obtener los detalles.");
                            res.json(details);
                        }
                    );
                }
            );
        });
    },
};
