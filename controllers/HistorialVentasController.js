module.exports = {
    // Obtener historial de ventas de un cliente
    getHistorialVentasByUser: (req, res) => {
      const userId = req.userId; // Se obtiene del middleware de autenticación
  
      req.getConnection((err, conn) => {
        if (err) return res.status(500).send("Error de conexión a la base de datos.");
  
        const query = `
          SELECT 
            hv.IdHistorialVenta,
            hv.ID_Pedido,
            hv.FechaVenta,
            hv.TotalVenta,
            hv.EstadoVenta,
            hv.Notas
          FROM 
            HistorialVentas hv
          WHERE 
            hv.ID_Usuario = ?;
        `;
  
        conn.query(query, [userId], (err, rows) => {
          if (err) return res.status(500).send("Error al obtener el historial de ventas.");
          res.json(rows);
        });
      });
    },
  
    // Obtener detalles de una venta específica en el historial
    getDetalleVentaHistorial: (req, res) => {
      const idHistorialVenta = req.params.id; // ID del historial de venta
  
      req.getConnection((err, conn) => {
        if (err) return res.status(500).send("Error de conexión a la base de datos.");
  
        const query = `
          SELECT 
            dp.ID_Detalle,
            p.NombreProducto,
            p.ImgProducto,
            dp.Cantidad,
            dp.PrecioUnitario,
            dp.Cantidad * dp.PrecioUnitario AS Subtotal
          FROM 
            DetallesPedido dp
          JOIN 
            Productos p ON dp.ID_Producto = p.ID_Producto
          WHERE 
            dp.ID_Pedido = (
              SELECT 
                ID_Pedido
              FROM 
                HistorialVentas
              WHERE 
                IdHistorialVenta = ?
            );
        `;
  
        conn.query(query, [idHistorialVenta], (err, rows) => {
          if (err) return res.status(500).send("Error al obtener los detalles de la venta.");
          res.json(rows);
        });
      });
    }
  };
  