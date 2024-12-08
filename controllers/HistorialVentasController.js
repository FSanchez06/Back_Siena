module.exports = {
    // Obtener historial de ventas de un cliente
    getHistorialVentasByUser: (req, res) => {
      const userId = req.userId; // ID del usuario obtenido del middleware de autenticación
      const userRole = req.userRole; // Rol del usuario obtenido del token

      req.getConnection((err, conn) => {
          if (err) return res.status(500).send("Error de conexión a la base de datos.");

          // Definir consulta y parámetros basados en el rol del usuario
          const query = 
              userRole === 3 // Si es cliente, mostrar solo sus ventas
                  ? `
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
                          hv.ID_Usuario = ?
                      ORDER BY 
                          hv.FechaVenta DESC;
                  `
                  : `
                      SELECT 
                          hv.IdHistorialVenta,
                          hv.ID_Pedido,
                          hv.FechaVenta,
                          hv.TotalVenta,
                          hv.EstadoVenta,
                          hv.Notas,
                          u.ID_Usuario,
                          u.Nombre AS "NombreUsuario",
                          u.Email,
                          u.Telefono,
                          u.Ciudad,
                          u.CodPostal,
                          u.Direccion
                      FROM 
                          HistorialVentas hv
                      JOIN Usuario u ON hv.ID_Usuario = u.ID_Usuario
                      ORDER BY 
                          hv.FechaVenta DESC;
                  `;

          const params = userRole === 3 ? [userId] : []; // Parámetros según el rol

          conn.query(query, params, (err, rows) => {
              if (err) {
                  console.error("Error al ejecutar la consulta SQL:", err);
                  return res.status(500).send("Error al obtener el historial de ventas.");
              }
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
  