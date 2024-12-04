const actualizarTotalEnHistorial = (conn, pedidoId, nuevoTotal, callback) => {
    conn.query(
        "UPDATE HistorialPedidos SET Total = ? WHERE ID_Pedido = ?",
        [nuevoTotal, pedidoId],
        (err) => {
            if (err) {
                console.error("Error al actualizar el historial del pedido:", err);
                return callback(err);
            }
            callback(null);
        }
    );
};



module.exports = {
    // Crear un nuevo pedido
    createOrder: (req, res) => {
        const { Detalles, FechaEntrega, shippingCharge } = req.body;
        const userId = req.userId;
    
        console.log("Datos recibidos:", { Detalles, FechaEntrega, userId, shippingCharge });
    
        // Validaciones iniciales
        if (!Detalles || !Array.isArray(Detalles) || Detalles.length === 0) {
            return res.status(400).json({ message: "El pedido debe contener al menos un detalle." });
        }
    
        if (!FechaEntrega) {
            return res.status(400).json({ message: "Debe seleccionar una fecha de entrega." });
        }
    
        const fechaEntrega = new Date(FechaEntrega);
        const fechaMinima = new Date();
        fechaMinima.setDate(fechaMinima.getDate() + 10);
        const fechaMaxima = new Date();
        fechaMaxima.setMonth(fechaMaxima.getMonth() + 3);
    
        if (fechaEntrega < fechaMinima || fechaEntrega > fechaMaxima) {
            return res.status(400).json({
                message: `La fecha de entrega debe estar entre ${fechaMinima.toISOString().split('T')[0]} y ${fechaMaxima.toISOString().split('T')[0]}.`,
            });
        }
    
        const newOrder = {
            ID_Usuario: userId,
            ID_MetodoPago: null,
            Total: 0,
            Estado: "Por pagar",
            FechaEntrega,
        };
    
        req.getConnection((err, conn) => {
            if (err) {
                console.error("Error de conexión a la base de datos:", err);
                return res.status(500).json({ message: "Error de conexión a la base de datos." });
            }
    
            conn.beginTransaction((err) => {
                if (err) {
                    console.error("Error al iniciar la transacción:", err);
                    return res.status(500).json({ message: "Error al iniciar la transacción." });
                }
    
                conn.query("INSERT INTO Pedidos SET ?", [newOrder], (err, result) => {
                    if (err) {
                        console.error("Error al insertar pedido:", err.sqlMessage || err.message);
                        conn.rollback();
                        return res.status(500).json({ message: "Error al crear el pedido." });
                    }
    
                    const pedidoId = result.insertId;
                    console.log("Pedido creado con ID:", pedidoId);
    
                    const detallesQuery = Detalles.map((detalle) => [
                        pedidoId,
                        detalle.ID_Producto,
                        detalle.Cantidad,
                        detalle.PrecioUnitario,
                    ]);
    
                    conn.query(
                        "INSERT INTO DetallesPedido (ID_Pedido, ID_Producto, Cantidad, PrecioUnitario) VALUES ?",
                        [detallesQuery],
                        (err) => {
                            if (err) {
                                console.error("Error al insertar detalles del pedido:", err.sqlMessage || err.message);
                                conn.rollback();
                                return res.status(500).json({ message: "Error al crear los detalles del pedido." });
                            }
    
                            conn.query(
                                "UPDATE Pedidos SET Total = (SELECT SUM(Cantidad * PrecioUnitario) FROM DetallesPedido WHERE ID_Pedido = ?) + ? WHERE ID_Pedido = ?",
                                [pedidoId, shippingCharge, pedidoId],
                                (err) => {
                                    if (err) {
                                        console.error("Error al actualizar el total del pedido:", err.sqlMessage || err.message);
                                        conn.rollback();
                                        return res.status(500).json({ message: "Error al calcular el total del pedido." });
                                    }
    
                                    conn.query(
                                        `INSERT INTO HistorialPedidos (ID_Pedido, ID_Usuario, FechaPedido, FechaEntrega, EstadoPedido, Total, Observaciones)
                                         SELECT ID_Pedido, ID_Usuario, FechaPedido, FechaEntrega, Estado, Total, NULL
                                         FROM Pedidos WHERE ID_Pedido = ?`,
                                        [pedidoId],
                                        (err) => {
                                            if (err) {
                                                console.error("Error al insertar en historial del pedido:", err.sqlMessage || err.message);
                                                conn.rollback();
                                                return res.status(500).json({ message: "Error al registrar el historial del pedido." });
                                            }
    
                                            conn.commit((err) => {
                                                if (err) {
                                                    console.error("Error al confirmar la transacción:", err);
                                                    conn.rollback();
                                                    return res.status(500).json({ message: "Error al confirmar la transacción." });
                                                }
    
                                                res.status(201).json({ message: "Pedido creado exitosamente y registrado en el historial." });
                                            });
                                        }
                                    );
                                }
                            );
                        }
                    );
                });
            });
        });
    },
    
    
    // Obtener un pedido por ID
    getOrderById: (req, res) => {
        const pedidoId = req.params.id;
        const userId = req.userId;
        const userRole = req.userRole;

        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");

            conn.query(
                "SELECT * FROM Pedidos WHERE ID_Pedido = ?",
                [pedidoId],
                (err, results) => {
                    if (err || results.length === 0) {
                        return res.status(404).send("Pedido no encontrado.");
                    }

                    const pedido = results[0];

                    // Verificar que el pedido pertenece al usuario
                    if (userRole === 3 && pedido.ID_Usuario !== userId) {
                        return res.status(403).send("No tienes permiso para ver este pedido.");
                    }

                    res.json(pedido);
                }
            );
        });
    },

    // Obtener todos los pedidos del usuario (o todos si es admin/empleado)
    getUserOrders: (req, res) => {
        const userId = req.userId;
        const userRole = req.userRole;

        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");

            const query =
                userRole === 3
                    ? "SELECT * FROM Pedidos WHERE ID_Usuario = ?"
                    : "SELECT * FROM Pedidos";

            const params = userRole === 3 ? [userId] : [];

            conn.query(query, params, (err, results) => {
                if (err) return res.status(500).send("Error al obtener los pedidos.");
                res.json(results);
            });
        });
    },

    // Modificar la fecha de entrega por cliente
    updateDeliveryDateByClient: (req, res) => {
        const pedidoId = req.params.id;
        const { FechaEntrega } = req.body;
        const userId = req.userId;
    
        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");
    
            // Obtener detalles del pedido
            conn.query(
                "SELECT FechaPedido, Estado, ID_Usuario FROM Pedidos WHERE ID_Pedido = ?",
                [pedidoId],
                (err, results) => {
                    if (err || results.length === 0) return res.status(404).send("Pedido no encontrado.");
                    const pedido = results[0];
    
                    // Verificar que el pedido pertenece al usuario
                    if (pedido.ID_Usuario !== userId) {
                        return res.status(403).send("No tienes permiso para modificar este pedido.");
                    }
    
                    // Validar estado del pedido
                    if (pedido.Estado !== "Pagado" && pedido.Estado !== "Pago contra entrega") {
                        return res.status(400).send("La fecha de entrega solo puede actualizarse después de realizar el pago.");
                    }
    
                    const nuevaFecha = new Date(FechaEntrega);
                    const fechaActual = new Date();
                    const fechaMinima = new Date(fechaActual);
                    const fechaMaxima = new Date(fechaActual);
    
                    fechaMinima.setDate(fechaMinima.getDate() + 10); // 10 días después de hoy
                    fechaMaxima.setMonth(fechaMaxima.getMonth() + 3); // 3 meses después de hoy
    
                    if (nuevaFecha < fechaMinima || nuevaFecha > fechaMaxima) {
                        return res.status(400).send(
                            `La fecha de entrega debe estar entre ${fechaMinima.toISOString().split('T')[0]} y ${fechaMaxima.toISOString().split('T')[0]}.`
                        );
                    }
    
                    // Actualizar la fecha de entrega
                    conn.query(
                        "UPDATE Pedidos SET FechaEntrega = ? WHERE ID_Pedido = ?",
                        [FechaEntrega, pedidoId],
                        (err) => {
                            if (err) return res.status(500).send("Error al actualizar la fecha de entrega.");
                            res.send("Fecha de entrega actualizada correctamente.");
                        }
                    );
                }
            );
        });
    },
    
    

    // Modificar la fecha de entrega por Admin/Empleado
    updateDeliveryDateByAdmin: (req, res) => {
        const pedidoId = req.params.id;
        const { FechaEntrega, Justificacion } = req.body;
        const adminId = req.userId; // ID del administrador que realiza el cambio
    
        if (!Justificacion || Justificacion.trim() === "") {
            return res.status(400).send("La justificación es obligatoria para actualizar la fecha de entrega.");
        }
    
        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");
    
            // Iniciar la transacción
            conn.beginTransaction((err) => {
                if (err) return res.status(500).send("Error al iniciar la transacción.");
    
                // Obtener la fecha actual de entrega antes de la actualización
                conn.query(
                    "SELECT FechaEntrega FROM Pedidos WHERE ID_Pedido = ?",
                    [pedidoId],
                    (err, results) => {
                        if (err || results.length === 0) {
                            conn.rollback();
                            return res.status(404).send("Pedido no encontrado.");
                        }
    
                        const fechaAnterior = results[0].FechaEntrega;
    
                        // Actualizar la fecha de entrega en la tabla Pedidos
                        conn.query(
                            "UPDATE Pedidos SET FechaEntrega = ? WHERE ID_Pedido = ?",
                            [FechaEntrega, pedidoId],
                            (err) => {
                                if (err) {
                                    conn.rollback();
                                    return res.status(500).send("Error al actualizar la fecha de entrega.");
                                }
    
                                // Registrar el cambio en el historial
                                const historial = {
                                    ID_Pedido: pedidoId,
                                    Cambio: "Cambio de fecha de entrega",
                                    ValorAnterior: fechaAnterior, // Fecha anterior obtenida
                                    ValorNuevo: FechaEntrega,
                                    FechaCambio: new Date(),
                                    ID_Usuario: adminId,
                                    Justificacion: Justificacion
                                };
    
                                conn.query(
                                    "INSERT INTO HistorialPedidos (ID_Pedido, Cambio, ValorAnterior, ValorNuevo, FechaCambio, ID_Usuario, Justificacion) VALUES (?, ?, ?, ?, NOW(), ?, ?)",
                                    [
                                        historial.ID_Pedido,
                                        historial.Cambio,
                                        historial.ValorAnterior,
                                        historial.ValorNuevo,
                                        historial.ID_Usuario,
                                        historial.Justificacion
                                    ],
                                    (err) => {
                                        if (err) {
                                            conn.rollback();
                                            return res.status(500).send("Error al registrar el historial del cambio.");
                                        }
    
                                        // Confirmar la transacción
                                        conn.commit((err) => {
                                            if (err) {
                                                conn.rollback();
                                                return res.status(500).send("Error al confirmar el cambio.");
                                            }
    
                                            res.send("Fecha de entrega actualizada correctamente con justificación.");
                                        });
                                    }
                                );
                            }
                        );
                    }
                );
            });
        });
    },    
    
    

    // Actualizar cantidades de productos (solo si está "Por pagar")
    updateOrderQuantity: (req, res) => {
        const pedidoId = req.params.id;
        const { Detalles } = req.body;
    
        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");
    
            // Verificar el estado del pedido
            conn.query(
                "SELECT Estado FROM Pedidos WHERE ID_Pedido = ?",
                [pedidoId],
                (err, results) => {
                    if (err || results.length === 0) return res.status(404).send("Pedido no encontrado.");
                    const pedido = results[0];
    
                    // Verificar que el pedido esté en estado "Por pagar"
                    if (pedido.Estado !== "Por pagar") {
                        return res.status(400).send("Las cantidades solo se pueden modificar cuando el pedido está en estado 'Por pagar'.");
                    }
    
                    // Actualizar las cantidades
                    const updateQueries = Detalles.map(detalle => [
                        detalle.Cantidad,
                        pedidoId,
                        detalle.ID_Producto,
                    ]);
    
                    conn.query(
                        "UPDATE DetallesPedido SET Cantidad = ? WHERE ID_Pedido = ? AND ID_Producto = ?",
                        [updateQueries],
                        (err) => {
                            if (err) return res.status(500).send("Error al actualizar las cantidades.");
    
                            // Actualizar el total del pedido
                            conn.query(
                                "UPDATE Pedidos SET Total = (SELECT SUM(Cantidad * PrecioUnitario) FROM DetallesPedido WHERE ID_Pedido = ?) WHERE ID_Pedido = ?",
                                [pedidoId, pedidoId],
                                (err) => {
                                    if (err) return res.status(500).send("Error al actualizar el total del pedido.");
    
                                    // Obtener el nuevo total para actualizar en el historial
                                    conn.query(
                                        "SELECT Total FROM Pedidos WHERE ID_Pedido = ?",
                                        [pedidoId],
                                        (err, results) => {
                                            if (err || results.length === 0) {
                                                return res.status(500).send("Error al obtener el total actualizado del pedido.");
                                            }
    
                                            const nuevoTotal = results[0].Total;
    
                                            // Actualizar el total en el historial
                                            actualizarTotalEnHistorial(conn, pedidoId, nuevoTotal, (err) => {
                                                if (err) return res.status(500).send("Error al actualizar el historial del pedido.");
                                                res.send("Cantidades actualizadas correctamente y sincronizadas en el historial.");
                                            });
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        });
    },
    

    // Procesar pago de un pedido
    processPayment: (req, res) => {
        const pedidoId = req.params.id;
        const { ID_MetodoPago, Estado } = req.body;
        const userId = req.userId;
    
        const validTransitions = {
            "Por pagar": ["Pagado", "Pago contra entrega"]
        };
    
        if (!validTransitions["Por pagar"].includes(Estado)) {
            return res.status(400).send("Transición de estado inválida para el pedido.");
        }
    
        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");
    
            conn.beginTransaction((err) => {
                if (err) return res.status(500).send("Error al iniciar la transacción.");
    
                // Verificar pedido y estado actual
                conn.query(
                    "SELECT Total, Estado FROM Pedidos WHERE ID_Pedido = ?",
                    [pedidoId],
                    (err, results) => {
                        if (err || results.length === 0) {
                            conn.rollback();
                            return res.status(404).send("Pedido no encontrado.");
                        }
    
                        const pedido = results[0];
                        if (pedido.Estado !== "Por pagar") {
                            conn.rollback();
                            return res.status(400).send("El pedido ya no está disponible para el pago.");
                        }
    
                        // Actualizar método de pago y estado
                        conn.query(
                            "UPDATE Pedidos SET ID_MetodoPago = ?, Estado = ? WHERE ID_Pedido = ?",
                            [ID_MetodoPago, Estado, pedidoId],
                            (err) => {
                                if (err) {
                                    conn.rollback();
                                    return res.status(500).send("Error al actualizar el pedido.");
                                }
    
                                // Crear registro en la tabla Ventas
                                if (["Pagado", "Pago contra entrega"].includes(Estado)) {
                                    const nuevaVenta = {
                                        ID_Pedido: pedidoId,
                                        TotalVenta: pedido.Total,
                                        Estado: "En proceso",
                                        FechaVenta: new Date(),
                                        ID_Usuario: userId
                                    };
    
                                    conn.query("INSERT INTO Ventas SET ?", [nuevaVenta], (err) => {
                                        if (err) {
                                            conn.rollback();
                                            return res.status(500).send("Error al registrar la venta.");
                                        }
    
                                        conn.commit((err) => {
                                            if (err) {
                                                conn.rollback();
                                                return res.status(500).send("Error al confirmar el pago.");
                                            }
    
                                            res.status(201).send("Pago procesado exitosamente y venta registrada.");
                                        });
                                    });
                                } else {
                                    conn.commit((err) => {
                                        if (err) {
                                            conn.rollback();
                                            return res.status(500).send("Error al confirmar el pago.");
                                        }
    
                                        res.status(200).send("Pago procesado exitosamente.");
                                    });
                                }
                            }
                        );
                    }
                );
            });
        });
    },
    
    deleteProductFromOrder: (req, res) => {
        const { pedidoId, productId } = req.params;
    
        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");
    
            // Verificar el estado del pedido
            conn.query(
                "SELECT Estado FROM Pedidos WHERE ID_Pedido = ?",
                [pedidoId],
                (err, results) => {
                    if (err || results.length === 0) {
                        return res.status(404).send("Pedido no encontrado.");
                    }
    
                    const pedido = results[0];
    
                    // Verificar que el pedido esté en estado 'Por pagar'
                    if (pedido.Estado !== "Por pagar") {
                        return res.status(400).send("Solo puedes eliminar productos de pedidos en estado 'Por pagar'.");
                    }
    
                    // Eliminar el producto del pedido
                    conn.query(
                        "DELETE FROM DetallesPedido WHERE ID_Pedido = ? AND ID_Producto = ?",
                        [pedidoId, productId],
                        (err) => {
                            if (err) return res.status(500).send("Error al eliminar el producto del pedido.");
    
                            // Actualizar el total del pedido
                            conn.query(
                                "UPDATE Pedidos SET Total = (SELECT SUM(Cantidad * PrecioUnitario) FROM DetallesPedido WHERE ID_Pedido = ?) WHERE ID_Pedido = ?",
                                [pedidoId, pedidoId],
                                (err) => {
                                    if (err) return res.status(500).send("Error al actualizar el total del pedido.");
    
                                    // Obtener el nuevo total para actualizar en el historial
                                    conn.query(
                                        "SELECT Total FROM Pedidos WHERE ID_Pedido = ?",
                                        [pedidoId],
                                        (err, results) => {
                                            if (err || results.length === 0) {
                                                return res.status(500).send("Error al obtener el total actualizado del pedido.");
                                            }
    
                                            const nuevoTotal = results[0].Total;
    
                                            // Actualizar el total en el historial
                                            actualizarTotalEnHistorial(conn, pedidoId, nuevoTotal, (err) => {
                                                if (err) return res.status(500).send("Error al actualizar el historial del pedido.");
                                                res.send("Producto eliminado del pedido y sincronizado en el historial.");
                                            });
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        });
    },
    
    
    
    cancelOrder: (req, res) => {
        const pedidoId = req.params.id;
        const { Justificacion } = req.body; // Obtener la justificación de la solicitud
    
        // Verificar que la justificación no esté vacía
        if (!Justificacion || Justificacion.trim() === "") {
            return res.status(400).send("La justificación es obligatoria para cancelar el pedido.");
        }
    
        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");
    
            // Obtener los detalles necesarios del pedido
            conn.query(
                "SELECT FechaPedido, FechaEntrega, Estado, Total, ID_Usuario FROM Pedidos WHERE ID_Pedido = ?",
                [pedidoId],
                (err, results) => {
                    if (err || results.length === 0) {
                        return res.status(404).send("Pedido no encontrado.");
                    }
    
                    const pedido = results[0];
                    if (pedido.Estado !== "Por pagar") {
                        return res.status(400).send("Solo puedes cancelar pedidos en estado 'Por pagar'.");
                    }
    
                    // Actualizar el estado del pedido a 'Cancelado'
                    conn.query("UPDATE Pedidos SET Estado = 'Cancelado' WHERE ID_Pedido = ?", [pedidoId], (err) => {
                        if (err) return res.status(500).send("Error al cancelar el pedido.");
    
                        // Insertar en el historial
                        const historial = {
                            ID_Pedido: pedidoId,
                            ID_Usuario: pedido.ID_Usuario,
                            FechaPedido: pedido.FechaPedido,
                            FechaEntrega: pedido.FechaEntrega,
                            EstadoPedido: "Cancelado",
                            Total: pedido.Total,
                            Observaciones: Justificacion.trim(),
                        };
    
                        conn.query(
                            "INSERT INTO HistorialPedidos (ID_Pedido, ID_Usuario, FechaPedido, FechaEntrega, EstadoPedido, Total, Observaciones) VALUES (?, ?, ?, ?, ?, ?, ?)",
                            [
                                historial.ID_Pedido,
                                historial.ID_Usuario,
                                historial.FechaPedido,
                                historial.FechaEntrega,
                                historial.EstadoPedido,
                                historial.Total,
                                historial.Observaciones,
                            ],
                            (err) => {
                                if (err) return res.status(500).send("Error al registrar el historial del cambio.");
    
                                // Responder con éxito
                                res.send("Pedido cancelado exitosamente y registrado en el historial.");
                            }
                        );
                    });
                }
            );
        });
    },    
    
};
