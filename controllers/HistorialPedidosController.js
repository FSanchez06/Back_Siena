
module.exports = {
    // Obtener historial de pedidos de un usuario específico

  
    getHistorialPedidosByUser: (req, res) => {
      const userId = req.userId; // Se obtiene del middleware de autenticación
  
      req.getConnection((err, conn) => {
          if (err) return res.status(500).send("Error de conexión a la base de datos.");
  
          // Definir consulta y parámetros basados en el userId
          let query;
          let params;
  
          if (userId === 3) {
              // Mostrar pedidos solo del usuario con ID 3
              query = `
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
                  JOIN 
                      Pedidos p ON hp.ID_Pedido = p.ID_Pedido
                  WHERE 
                      hp.ID_Usuario = ?;
              `;
              params = [userId];
          } else {
              // Mostrar todos los pedidos
              query = `
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
                  JOIN 
                      Pedidos p ON hp.ID_Pedido = p.ID_Pedido;
              `;
              params = [];
          }
  
          conn.query(query, params, (err, rows) => {
              if (err) return res.status(500).send("Error al obtener el historial de pedidos.");
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
  