module.exports = {
    // Crear un mensaje (accesible para todos)
    createMessage: (req, res) => {
        const { NombreUsuario, EmailUsuario, Mensaje } = req.body;
    
        if (!NombreUsuario || !EmailUsuario || !Mensaje) {
            return res.status(400).send("Todos los campos son obligatorios.");
        }
    
        const newMessage = {
            NombreUsuario,
            EmailUsuario,
            Mensaje,
            ID_Usuario: req.userId || null // Asignar ID_Usuario si el token es válido
        };
    
        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");
    
            conn.query("INSERT INTO Mensajes SET ?", [newMessage], (err) => {
                if (err) return res.status(500).send("Error al guardar el mensaje.");
                res.status(201).send("Mensaje enviado exitosamente.");
            });
        });
    },

    // Consultar mensajes propios (Clientes logueados)
    getMyMessages: (req, res) => {
        const userId = req.userId;

        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");

            conn.query("SELECT * FROM Mensajes WHERE ID_Usuario = ?", [userId], (err, rows) => {
                if (err) return res.status(500).send("Error al obtener los mensajes.");
                res.json(rows);
            });
        });
    },

    // Consultar todos los mensajes (Administradores)
    getAllMessages: (req, res) => {
        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");

            conn.query("SELECT * FROM Mensajes", (err, rows) => {
                if (err) return res.status(500).send("Error al obtener los mensajes.");
                res.json(rows);
            });
        });
    },

    // Actualizar un mensaje propio
    updateMessage: (req, res) => {
        const messageId = req.params.id;
        const userId = req.userId; // Asegura que `req.userId` esté disponible (middleware).
        const { Mensaje } = req.body;
    
        if (!Mensaje) {
            return res.status(400).send("El mensaje no puede estar vacío.");
        }
    
        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");
    
            conn.query(
                "UPDATE Mensajes SET Mensaje = ? WHERE ID_mensaje = ? AND ID_Usuario = ?",
                [Mensaje, messageId, userId],
                (err, result) => {
                    if (err) return res.status(500).send("Error al actualizar el mensaje.");
                    if (result.affectedRows === 0) {
                        return res.status(404).send("Mensaje no encontrado o no autorizado.");
                    }
                    res.send("Mensaje actualizado exitosamente.");
                }
            );
        });
    },

    // Eliminar un mensaje (propio o como administrador)
    deleteMessage: (req, res) => {
        const messageId = req.params.id;
        const userId = req.userId;

        const isAdmin = req.userRole === 1;

        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");

            const query = isAdmin
                ? "DELETE FROM Mensajes WHERE ID_mensaje = ?"
                : "DELETE FROM Mensajes WHERE ID_mensaje = ? AND ID_Usuario = ?";

            const params = isAdmin ? [messageId] : [messageId, userId];

            conn.query(query, params, (err, result) => {
                if (err) return res.status(500).send("Error al eliminar el mensaje.");
                if (result.affectedRows === 0) {
                    return res.status(404).send("Mensaje no encontrado o no autorizado.");
                }
                res.send("Mensaje eliminado exitosamente.");
            });
        });
    },

    // Responder un mensaje (solo Administradores)
    respondToMessage: (req, res) => {
        const messageId = req.params.id;
        const { Respuesta } = req.body;

        if (!Respuesta) {
            return res.status(400).send("La respuesta no puede estar vacía.");
        }

        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");

            conn.query(
                "UPDATE Mensajes SET Respuesta = ? WHERE ID_mensaje = ?",
                [Respuesta, messageId],
                (err, result) => {
                    if (err) return res.status(500).send("Error al responder el mensaje.");
                    if (result.affectedRows === 0) {
                        return res.status(404).send("Mensaje no encontrado.");
                    }
                    res.send("Mensaje respondido exitosamente.");
                }
            );
        });
    },
};
