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

const insertarEnHistorialDetalles = (conn, pedidoId, detalles, callback) => {
    const syncPromises = detalles.map((detalle) => {
        return new Promise((resolve, reject) => {
            conn.query(
                `INSERT INTO HistorialDetallesPedido (IdHistorialPedido, ID_Producto, Cantidad, Subtotal, PrecioUnitario)
                 SELECT hp.IdHistorialPedido, ?, ?, ?, ?
                 FROM HistorialPedidos hp
                 WHERE hp.ID_Pedido = ?`,
                [detalle.ID_Producto, detalle.Cantidad, detalle.Cantidad * detalle.PrecioUnitario, detalle.PrecioUnitario, pedidoId],
                (err) => {
                    if (err) return reject(err);
                    resolve();
                }
            );
        });
    });

    Promise.all(syncPromises)
        .then(() => callback(null))
        .catch((err) => callback(err));
};

const actualizarEstadoYFechaEnHistorial = (conn, pedidoId, nuevoEstado, nuevaFechaEntrega, callback) => {
    conn.query(
        "UPDATE HistorialPedidos SET EstadoPedido = ?, FechaEntrega = ? WHERE ID_Pedido = ?",
        [nuevoEstado, nuevaFechaEntrega, pedidoId],
        (err) => {
            if (err) {
                console.error("Error al actualizar el historial del pedido:", err);
                return callback(err);
            }
            callback(null);
        }
    );
};

const actualizarEstadoPedido = (conn, pedidoId, nuevoEstado, nuevaFechaEntrega = null, callback) => {
    conn.query(
        "UPDATE Pedidos SET Estado = ?, FechaEntrega = ? WHERE ID_Pedido = ?",
        [nuevoEstado, nuevaFechaEntrega, pedidoId],
        (err) => {
            if (err) {
                console.error("Error al actualizar el pedido:", err);
                return callback(err);
            }

            actualizarEstadoYFechaEnHistorial(conn, pedidoId, nuevoEstado, nuevaFechaEntrega, (err) => {
                if (err) {
                    console.error("Error al sincronizar estado en el historial:", err);
                    return callback(err);
                }
                callback(null);
            });
        }
    );
};

module.exports = {
    // Crear un nuevo pedido
    
    createOrder: (req, res) => {
        const { Detalles, FechaEntrega, shippingCharge } = req.body;
        const userId = req.userId;
    
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
    
            // Validar stock disponible antes de proceder
            const validationPromises = Detalles.map((detalle) => {
                return new Promise((resolve, reject) => {
                    conn.query(
                        "SELECT StockDisponible FROM Productos WHERE ID_Producto = ?",
                        [detalle.ID_Producto],
                        (err, results) => {
                            if (err || results.length === 0) return reject(`Producto con ID ${detalle.ID_Producto} no encontrado.`);
                            const stockDisponible = results[0].StockDisponible;
    
                            if (detalle.Cantidad > stockDisponible) {
                                return reject(`El producto con ID ${detalle.ID_Producto} no tiene suficiente stock.`);
                            }
                            resolve();
                        }
                    );
                });
            });
    
            Promise.all(validationPromises)
                .then(() => {
                    // Continuar con la creación del pedido si la validación es exitosa
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
    
                                                    insertarEnHistorialDetalles(conn, pedidoId, Detalles, (err) => {
                                                        if (err) {
                                                            console.error("Error al sincronizar detalles en el historial:", err);
                                                            conn.rollback();
                                                            return res.status(500).json({ message: "Error al sincronizar detalles en el historial." });
                                                        }
    
                                                        conn.commit((err) => {
                                                            if (err) {
                                                                console.error("Error al confirmar la transacción:", err);
                                                                conn.rollback();
                                                                return res.status(500).json({ message: "Error al confirmar la transacción." });
                                                            }
    
                                                            res.status(201).json({
                                                                message: "Pedido creado exitosamente y registrado en el historial.",
                                                            });
                                                        });
                                                    });
                                                }
                                            );
                                        }
                                    );
                                }
                            );
                        });
                    });
                })
                .catch((err) => {
                    console.error("Error en validación de stock:", err);
                    res.status(400).json({ message: err });
                });
        });
        console.log("Datos recibidos en el controlador:", req.body);

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
    
                    // Actualizar la fecha de entrega en `Pedidos` y sincronizar con `HistorialPedidos`
                    conn.beginTransaction((err) => {
                        if (err) return res.status(500).send("Error al iniciar la transacción.");
    
                        conn.query(
                            "UPDATE Pedidos SET FechaEntrega = ? WHERE ID_Pedido = ?",
                            [FechaEntrega, pedidoId],
                            (err) => {
                                if (err) {
                                    conn.rollback();
                                    return res.status(500).send("Error al actualizar la fecha de entrega.");
                                }
    
                                // Actualizar en `HistorialPedidos`
                                actualizarEstadoYFechaEnHistorial(
                                    conn,
                                    pedidoId,
                                    pedido.Estado, // No cambió el estado, pero puede cambiar en otras funciones
                                    FechaEntrega,
                                    (err) => {
                                        if (err) {
                                            conn.rollback();
                                            return res.status(500).send("Error al sincronizar la fecha en el historial.");
                                        }
    
                                        conn.commit((err) => {
                                            if (err) {
                                                conn.rollback();
                                                return res.status(500).send("Error al confirmar los cambios.");
                                            }
    
                                            res.send("Fecha de entrega actualizada correctamente.");
                                        });
                                    }
                                );
                            }
                        );
                    });
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
    
            conn.beginTransaction((err) => {
                if (err) return res.status(500).send("Error al iniciar la transacción.");
    
                // Obtener la fecha actual de entrega antes de la actualización
                conn.query(
                    "SELECT FechaEntrega, Estado FROM Pedidos WHERE ID_Pedido = ?",
                    [pedidoId],
                    (err, results) => {
                        if (err || results.length === 0) {
                            conn.rollback();
                            return res.status(404).send("Pedido no encontrado.");
                        }
    
                        const pedido = results[0];
                        const fechaAnterior = pedido.FechaEntrega;
    
                        // Actualizar la fecha de entrega en la tabla `Pedidos`
                        conn.query(
                            "UPDATE Pedidos SET FechaEntrega = ? WHERE ID_Pedido = ?",
                            [FechaEntrega, pedidoId],
                            (err) => {
                                if (err) {
                                    conn.rollback();
                                    return res.status(500).send("Error al actualizar la fecha de entrega.");
                                }
    
                                // Actualizar en `HistorialPedidos`
                                actualizarEstadoYFechaEnHistorial(
                                    conn,
                                    pedidoId,
                                    pedido.Estado, // El estado permanece igual
                                    FechaEntrega,
                                    (err) => {
                                        if (err) {
                                            conn.rollback();
                                            return res.status(500).send("Error al sincronizar la fecha en el historial.");
                                        }
    
                                        // Registrar el cambio en el historial con la justificación
                                        const historial = {
                                            ID_Pedido: pedidoId,
                                            Cambio: "Cambio de fecha de entrega",
                                            ValorAnterior: fechaAnterior, // Fecha anterior obtenida
                                            ValorNuevo: FechaEntrega,
                                            FechaCambio: new Date(),
                                            ID_Usuario: adminId,
                                            Justificacion: Justificacion.trim(),
                                        };
    
                                        conn.query(
                                            `INSERT INTO HistorialPedidos (ID_Pedido, ID_Usuario, FechaPedido, FechaEntrega, EstadoPedido, Total, Observaciones)
                                             SELECT ID_Pedido, ID_Usuario, FechaPedido, ?, EstadoPedido, Total, ? 
                                             FROM HistorialPedidos WHERE ID_Pedido = ?`,
                                            [FechaEntrega, Justificacion, pedidoId],
                                            (err) => {
                                                if (err) {
                                                    conn.rollback();
                                                    return res.status(500).send("Error al registrar el cambio en el historial.");
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
                    const updateQueries = Detalles.map((detalle) => [
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
            "Por pagar": ["Pagado", "Pago contra entrega"],
        };
    
        if (!validTransitions["Por pagar"].includes(Estado)) {
            return res.status(400).send("Transición de estado inválida para el pedido.");
        }
    
        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");
    
            conn.beginTransaction((err) => {
                if (err) return res.status(500).send("Error al iniciar la transacción.");
    
                // Obtener detalles del pedido
                conn.query(
                    "SELECT Total, Estado, ID_Usuario FROM Pedidos WHERE ID_Pedido = ?",
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
    
                        // Validar stock de productos
                        conn.query(
                            "SELECT ID_Producto, Cantidad FROM DetallesPedido WHERE ID_Pedido = ?",
                            [pedidoId],
                            (err, detalles) => {
                                if (err || detalles.length === 0) {
                                    conn.rollback();
                                    return res.status(500).send("Error al obtener los detalles del pedido.");
                                }
    
                                const stockValidationPromises = detalles.map((detalle) => {
                                    return new Promise((resolve, reject) => {
                                        conn.query(
                                            "SELECT StockDisponible FROM Productos WHERE ID_Producto = ?",
                                            [detalle.ID_Producto],
                                            (err, results) => {
                                                if (err || results.length === 0) {
                                                    return reject(`Producto con ID ${detalle.ID_Producto} no encontrado.`);
                                                }
    
                                                const stockDisponible = results[0].StockDisponible;
    
                                                if (detalle.Cantidad > stockDisponible) {
                                                    return reject(
                                                        `El producto con ID ${detalle.ID_Producto} no tiene suficiente stock.`
                                                    );
                                                }
                                                resolve();
                                            }
                                        );
                                    });
                                });
    
                                Promise.all(stockValidationPromises)
                                    .then(() => {
                                        // Actualizar el estado del pedido y registrar la venta
                                        actualizarEstadoPedido(conn, pedidoId, Estado, null, (err) => {
                                            if (err) {
                                                conn.rollback();
                                                return res
                                                    .status(500)
                                                    .send("Error al actualizar el estado del pedido.");
                                            }
    
                                            if (["Pagado", "Pago contra entrega"].includes(Estado)) {
                                                const nuevaVenta = {
                                                    ID_Pedido: pedidoId,
                                                    TotalVenta: pedido.Total,
                                                    Estado: "En proceso",
                                                    FechaVenta: new Date(),
                                                    ID_Usuario: pedido.ID_Usuario,
                                                };
    
                                                // Insertar la venta en la tabla Ventas
                                                conn.query("INSERT INTO Ventas SET ?", [nuevaVenta], (err, result) => {
                                                    if (err) {
                                                        conn.rollback();
                                                        return res
                                                            .status(500)
                                                            .send("Error al registrar la venta.");
                                                    }
    
                                                    const ventaId = result.insertId;
    
                                                    // Registrar en HistorialVentas
                                                    conn.query(
                                                        `INSERT INTO HistorialVentas 
                                                            (ID_Pedido, ID_Usuario, ID_MetodoPago, FechaVenta, TotalVenta, EstadoVenta, Notas)
                                                         VALUES (?, ?, 
                                                            (SELECT ID_MetodoPago FROM Pedidos WHERE ID_Pedido = ?),
                                                            ?, ?, ?, NULL)`,
                                                        [
                                                            pedidoId,
                                                            pedido.ID_Usuario,
                                                            pedidoId,
                                                            nuevaVenta.FechaVenta,
                                                            pedido.Total,
                                                            nuevaVenta.Estado,
                                                        ],
                                                        (err) => {
                                                            if (err) {
                                                                conn.rollback();
                                                                return res
                                                                    .status(500)
                                                                    .send("Error al registrar el historial de la venta.");
                                                            }
    
                                                            // Obtener los detalles del pedido e insertar en HistorialDetallesVenta
                                                            conn.query(
                                                                `SELECT ID_Producto, Cantidad, PrecioUnitario, 
                                                                    Cantidad * PrecioUnitario AS Subtotal 
                                                                 FROM DetallesPedido WHERE ID_Pedido = ?`,
                                                                [pedidoId],
                                                                (err, detalles) => {
                                                                    if (err) {
                                                                        conn.rollback();
                                                                        return res
                                                                            .status(500)
                                                                            .send("Error al obtener los detalles del pedido.");
                                                                    }
    
                                                                    const detallesQuery = detalles.map((detalle) => [
                                                                        ventaId,
                                                                        detalle.ID_Producto,
                                                                        detalle.Cantidad,
                                                                        detalle.PrecioUnitario,
                                                                        detalle.Subtotal,
                                                                    ]);
    
                                                                    conn.query(
                                                                        `INSERT INTO HistorialDetallesVenta 
                                                                            (IdHistorialVenta, ID_Producto, Cantidad, PrecioUnitario, Subtotal)
                                                                         VALUES ?`,
                                                                        [detallesQuery],
                                                                        (err) => {
                                                                            if (err) {
                                                                                conn.rollback();
                                                                                return res
                                                                                    .status(500)
                                                                                    .send(
                                                                                        "Error al registrar los detalles de la venta en el historial."
                                                                                    );
                                                                            }
    
                                                                            // Actualizar stock de los productos vendidos
                                                                            const stockUpdates = detalles.map((detalle) => {
                                                                                return new Promise((resolve, reject) => {
                                                                                    conn.query(
                                                                                        "UPDATE Productos SET StockDisponible = StockDisponible - ? WHERE ID_Producto = ?",
                                                                                        [detalle.Cantidad, detalle.ID_Producto],
                                                                                        (err) => {
                                                                                            if (err)
                                                                                                reject(
                                                                                                    "Error al actualizar el stock."
                                                                                                );
                                                                                            resolve();
                                                                                        }
                                                                                    );
                                                                                });
                                                                            });
    
                                                                            Promise.all(stockUpdates)
                                                                                .then(() => {
                                                                                    conn.commit((err) => {
                                                                                        if (err) {
                                                                                            conn.rollback();
                                                                                            return res
                                                                                                .status(500)
                                                                                                .send(
                                                                                                    "Error al confirmar el pago."
                                                                                                );
                                                                                        }
    
                                                                                        res.status(201).send({
                                                                                            message:
                                                                                                "Pago procesado exitosamente, venta registrada, detalles sincronizados y stock actualizado.",
                                                                                            ventaId,
                                                                                        });
                                                                                    });
                                                                                })
                                                                                .catch((err) => {
                                                                                    conn.rollback();
                                                                                    res.status(500).send(err);
                                                                                });
                                                                        }
                                                                    );
                                                                }
                                                            );
                                                        }
                                                    );
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
                                        });
                                    })
                                    .catch((err) => {
                                        console.error("Error en validación de stock:", err);
                                        conn.rollback();
                                        res.status(400).json({ message: err });
                                    });
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
    
            // Verificar que el pedido exista y esté en estado 'Por pagar'
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
    
                    conn.beginTransaction((err) => {
                        if (err) return res.status(500).send("Error al iniciar la transacción.");
    
                        // Eliminar el producto del pedido en `DetallesPedido`
                        conn.query(
                            "DELETE FROM DetallesPedido WHERE ID_Pedido = ? AND ID_Producto = ?",
                            [pedidoId, productId],
                            (err) => {
                                if (err) {
                                    conn.rollback();
                                    return res.status(500).send("Error al eliminar el producto del pedido.");
                                }
    
                                // Eliminar los registros relacionados en `HistorialDetallesVenta`
                                conn.query(
                                    `DELETE FROM HistorialDetallesVenta 
                                     WHERE ID_Producto = ? AND IdHistorialVenta IN (
                                         SELECT IdHistorialVenta FROM HistorialVentas WHERE ID_Pedido = ?
                                     )`,
                                    [productId, pedidoId],
                                    (err) => {
                                        if (err) {
                                            conn.rollback();
                                            return res.status(500).send("Error al actualizar el historial de detalles de la venta.");
                                        }
    
                                        // Recalcular el total del pedido en `Pedidos`
                                        conn.query(
                                            "UPDATE Pedidos SET Total = (SELECT COALESCE(SUM(Cantidad * PrecioUnitario), 0) FROM DetallesPedido WHERE ID_Pedido = ?) WHERE ID_Pedido = ?",
                                            [pedidoId, pedidoId],
                                            (err) => {
                                                if (err) {
                                                    conn.rollback();
                                                    return res.status(500).send("Error al actualizar el total del pedido.");
                                                }
    
                                                // Actualizar el total en el historial `HistorialPedidos`
                                                conn.query(
                                                    "SELECT Total FROM Pedidos WHERE ID_Pedido = ?",
                                                    [pedidoId],
                                                    (err, results) => {
                                                        if (err || results.length === 0) {
                                                            conn.rollback();
                                                            return res.status(500).send("Error al obtener el total actualizado del pedido.");
                                                        }
    
                                                        const nuevoTotal = results[0].Total;
    
                                                        conn.query(
                                                            "UPDATE HistorialPedidos SET Total = ? WHERE ID_Pedido = ?",
                                                            [nuevoTotal, pedidoId],
                                                            (err) => {
                                                                if (err) {
                                                                    conn.rollback();
                                                                    return res.status(500).send("Error al actualizar el historial del pedido.");
                                                                }
    
                                                                // Confirmar la transacción
                                                                conn.commit((err) => {
                                                                    if (err) {
                                                                        conn.rollback();
                                                                        return res.status(500).send("Error al confirmar la eliminación del producto.");
                                                                    }
    
                                                                    res.status(200).send("Producto eliminado del pedido y sincronizado en el historial.");
                                                                });
                                                            }
                                                        );
                                                    }
                                                );
                                            }
                                        );
                                    }
                                );
                            }
                        );
                    });
                }
            );
        });
    },       
    
    cancelOrder: (req, res) => {
        const pedidoId = req.params.id;
        const { Justificacion } = req.body; // Justificación proporcionada por el usuario
    
        // Validar que la justificación no esté vacía
        if (!Justificacion || Justificacion.trim() === "") {
            return res.status(400).send("La justificación es obligatoria para cancelar el pedido.");
        }
    
        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");
    
            // Obtener detalles del pedido antes de realizar actualizaciones
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
    
                    conn.beginTransaction((err) => {
                        if (err) return res.status(500).send("Error al iniciar la transacción.");
    
                        // Actualizar el estado del pedido a "Cancelado"
                        conn.query(
                            "UPDATE Pedidos SET Estado = 'Cancelado' WHERE ID_Pedido = ?",
                            [pedidoId],
                            (err) => {
                                if (err) {
                                    conn.rollback();
                                    return res.status(500).send("Error al cancelar el pedido.");
                                }
    
                                // Actualizar el historial con la observación
                                conn.query(
                                    "UPDATE HistorialPedidos SET Observaciones = ? WHERE ID_Pedido = ?",
                                    [`Pedido cancelado por el usuario. Justificación: ${Justificacion.trim()}`, pedidoId],
                                    (err) => {
                                        if (err) {
                                            conn.rollback();
                                            return res.status(500).send("Error al actualizar el historial del pedido.");
                                        }
    
                                        // Confirmar la transacción
                                        conn.commit((err) => {
                                            if (err) {
                                                conn.rollback();
                                                return res.status(500).send("Error al confirmar la cancelación del pedido.");
                                            }
    
                                            res.status(200).send("Pedido cancelado exitosamente y registrado en el historial.");
                                        });
                                    }
                                );
                            }
                        );
                    });
                }
            );
        });
    },
     
    
};
