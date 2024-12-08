
module.exports = {
    // Obtener historial de pedidos de un usuario específico

  
    getHistorialPedidosByUser: (req, res) => {
      const userId = req.userId; // ID del usuario obtenido del middleware de autenticación
      const userRole = req.userRole; // Rol del usuario obtenido del token
  
      req.getConnection((err, conn) => {
          if (err) return res.status(500).send("Error de conexión a la base de datos.");
  
          // Definir consulta y parámetros basados en el rol del usuario
          const query = 
              userRole === 3 // Si es cliente, mostrar solo sus pedidos
                  ? `
                      SELECT 
                          hp.IdHistorialPedido,
                          hp.ID_Pedido,
                          hp.FechaPedido,
                          hp.FechaEntrega,
                          hp.EstadoPedido,
                          hp.Total,
                          hp.Observaciones
                      FROM 
                          HistorialPedidos hp
                      JOIN Pedidos p ON hp.ID_Pedido = p.ID_Pedido
                      WHERE hp.ID_Usuario = ?
                      ORDER BY hp.FechaPedido DESC;
                    `
                  : `
                      SELECT 
                          hp.IdHistorialPedido,
                          hp.ID_Pedido,
                          hp.FechaPedido,
                          hp.FechaEntrega,
                          hp.EstadoPedido,
                          hp.Total,
                          hp.Observaciones,
                          u.ID_Usuario,
                          u.Nombre AS "NombreUsuario",
                          u.Email,
                          u.Telefono,
                          u.Ciudad,
                          u.CodPostal,
                          u.Direccion
                      FROM 
                          HistorialPedidos hp
                      JOIN Pedidos p ON hp.ID_Pedido = p.ID_Pedido
                      JOIN Usuario u ON hp.ID_Usuario = u.ID_Usuario
                      ORDER BY hp.FechaPedido DESC;
                    `;
  
          const params = userRole === 3 ? [userId] : []; // Parámetros según el rol
  
          conn.query(query, params, (err, rows) => {
              if (err) {
                  console.error("Error al ejecutar la consulta SQL:", err);
                  return res.status(500).send("Error al obtener el historial de pedidos.");
              }
              res.json(rows);
          });
      });
  },
  
  
    // Obtener detalles de un pedido específico en el historial
    getDetallesPedidoHistorial: (req, res) => {
      const historialPedidoId = req.params.id; // ID del historial de pedido
  
      req.getConnection((err, conn) => {
        if (err) return res.status(500).send("Error de conexión a la base de datos.");
  
        const query = `
          SELECT 
            dp.ID_Detalle,
            hp.IdHistorialPedido,
            p.NombreProducto,
            p.ImgProducto,
            dp.Cantidad,
            dp.PrecioUnitario,
            dp.Subtotal
          FROM 
            DetallesPedido dp
          JOIN 
            HistorialPedidos hp ON dp.ID_Pedido = hp.ID_Pedido
          JOIN 
            Productos p ON dp.ID_Producto = p.ID_Producto
          WHERE 
            hp.IdHistorialPedido = ?;
        `;
  
        conn.query(query, [historialPedidoId], (err, rows) => {
          if (err) return res.status(500).send("Error al obtener los detalles del pedido.");
          res.json(rows);
        });
      });
    }
  };
  