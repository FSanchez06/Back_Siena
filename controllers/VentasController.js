module.exports = {

    // Obtener una venta por ID
    getSaleById: (req, res) => {
        const saleId = req.params.id;
        const userId = req.userId;
        const userRole = req.userRole;

        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");

            conn.query("SELECT * FROM Ventas WHERE ID_Venta = ?", [saleId], (err, results) => {
                if (err || results.length === 0) return res.status(404).send("Venta no encontrada.");
                const venta = results[0];

                // Verificar que el usuario tiene permiso para ver la venta
                if (userRole === 3 && venta.ID_Usuario !== userId) {
                    return res.status(403).send("No tienes permiso para ver esta venta.");
                }

                res.json(venta);
            });
        });
    },

    // Obtener todas las ventas de un usuario (solo las ventas del cliente)
    getUserSales: (req, res) => {
        const userId = req.userId;

        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");

            conn.query(`SELECT 
                    V.ID_Venta,
                    V.FechaVenta AS "FechaCompra",
                    V.ID_Pedido,
                    V.TotalVenta,
                    V.Estado AS "EstadoVenta"
                FROM 
                    Ventas V
                WHERE 
                    V.ID_Usuario = ?
                ORDER BY V.FechaVenta DESC`, [userId], (err, results) => {
                if (err) return res.status(500).send("Error al obtener las ventas.");
                res.json(results);
            });
        });
    },

    // Obtener detalles de un pedido asociado a una venta
    getSaleDetails: (req, res) => {
        const ventaId = req.params.id;

        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");

            // Consulta para obtener los detalles del pedido asociado a la venta
            const query = `
                SELECT 
                    V.ID_Venta,
                    DP.ID_Pedido,
                    P.ImgProducto, -- Se agrega la columna de imagen del producto   
                    P.NombreProducto,
                    DP.Cantidad,
                    DP.PrecioUnitario,
                    DP.Subtotal
                FROM 
                    Ventas V
                JOIN 
                    DetallesPedido DP ON V.ID_Pedido = DP.ID_Pedido
                JOIN 
                    Productos P ON DP.ID_Producto = P.ID_Producto
                WHERE 
                    V.ID_Venta = ?`;

            conn.query(query, [ventaId], (err, results) => {
                if (err) return res.status(500).send("Error al obtener los detalles de la venta.");
                if (results.length === 0) return res.status(404).send("Detalles no encontrados para esta venta.");
                res.json(results);
            });
        });
    },

    // Actualizar el estado de una venta (Admin, Empleado)
    updateSaleStatus: (req, res) => {
        const saleId = req.params.id;
        const { Estado } = req.body;

        // Validar transiciones de estado
        const validTransitions = {
            "En proceso": ["Enviando", "Cancelada", "Reembolsada"],
            "Enviando": ["Entregado", "Cancelada"],
            "En proceso": ["Reembolsada"], // Si hay problemas con el pedido
        };

        if (!validTransitions[Estado]) {
            return res.status(400).send("Transición de estado inválida.");
        }

        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");

            conn.query("UPDATE Ventas SET Estado = ? WHERE ID_Venta = ?", [Estado, saleId], (err) => {
                if (err) return res.status(500).send("Error al actualizar el estado de la venta.");
                res.send("Estado de la venta actualizado correctamente.");
            });
        });
    },
    
    // Solicitar reembolso
    requestRefund: (req, res) => {
        const ventaId = req.params.id;
        const { Motivo } = req.body;
        const userId = req.userId;

        if (!Motivo || Motivo.trim() === "") {
            return res.status(400).send("El motivo del reembolso es obligatorio.");
        }

        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");

            // Validar si la venta puede ser reembolsada
            const query = `
                SELECT Estado, ID_Usuario 
                FROM Ventas 
                WHERE ID_Venta = ?`;

            conn.query(query, [ventaId], (err, results) => {
                if (err || results.length === 0) return res.status(404).send("Venta no encontrada.");
                const venta = results[0];

                if (venta.Estado !== "Entregado") {
                    return res.status(400).send("La venta no es elegible para un reembolso en su estado actual.");
                }

                if (venta.ID_Usuario !== userId) {
                    return res.status(403).send("No tienes permiso para solicitar el reembolso de esta venta.");
                }

                // Actualizar el estado de la venta y registrar el historial
                const updateQuery = `
                    UPDATE Ventas 
                    SET Estado = 'Reembolsada' 
                    WHERE ID_Venta = ?`;

                conn.query(updateQuery, [ventaId], (err) => {
                    if (err) return res.status(500).send("Error al procesar el reembolso.");

                    const historialQuery = `
                        INSERT INTO HistorialVentas 
                        (ID_Pedido, ID_Usuario, ID_MetodoPago, FechaVenta, TotalVenta, EstadoVenta, Notas)
                        SELECT 
                            V.ID_Pedido, V.ID_Usuario, P.ID_MetodoPago, V.FechaVenta, V.TotalVenta, 'Reembolsada', ?
                        FROM 
                            Ventas V
                        JOIN 
                            Pedidos P ON V.ID_Pedido = P.ID_Pedido
                        WHERE 
                            V.ID_Venta = ?`;

                    conn.query(historialQuery, [Motivo, ventaId], (err) => {
                        if (err) return res.status(500).send("Error al registrar el historial del reembolso.");
                        res.send("Reembolso procesado exitosamente.");
                    });
                });
            });
        });
    }
    
};
