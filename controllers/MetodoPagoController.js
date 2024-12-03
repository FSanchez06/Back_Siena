module.exports = {
    // Crear un nuevo método de pago
    createMetodoPago: (req, res) => {
        const { Nombre, Descripcion } = req.body;

        if (!Nombre) {
            return res.status(400).send("El nombre del método de pago es obligatorio.");
        }

        const newMetodoPago = { Nombre, Descripcion };

        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");

            conn.query("INSERT INTO MetodoPago SET ?", [newMetodoPago], (err, result) => {
                if (err) return res.status(500).send("Error al crear el método de pago.");
                res.status(201).send("Método de pago creado exitosamente.");
            });
        });
    },

    // Obtener todos los métodos de pago
    getAllMetodosPago: (req, res) => {
        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");

            conn.query("SELECT * FROM MetodoPago", (err, rows) => {
                if (err) return res.status(500).send("Error al obtener los métodos de pago.");
                res.json(rows);
            });
        });
    },

    // Actualizar un método de pago
    updateMetodoPago: (req, res) => {
        const metodoPagoId = req.params.id;
        const { Nombre, Descripcion } = req.body;

        if (!Nombre) {
            return res.status(400).send("El nombre del método de pago es obligatorio.");
        }

        const updatedMetodoPago = { Nombre, Descripcion };

        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");

            conn.query(
                "UPDATE MetodoPago SET ? WHERE ID_MetodoPago = ?",
                [updatedMetodoPago, metodoPagoId],
                (err, result) => {
                    if (err) return res.status(500).send("Error al actualizar el método de pago.");
                    if (result.affectedRows === 0) return res.status(404).send("Método de pago no encontrado.");
                    res.send("Método de pago actualizado exitosamente.");
                }
            );
        });
    },

    // Eliminar un método de pago
    deleteMetodoPago: (req, res) => {
        const metodoPagoId = req.params.id;

        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");

            conn.query(
                "DELETE FROM MetodoPago WHERE ID_MetodoPago = ?",
                [metodoPagoId],
                (err, result) => {
                    if (err) return res.status(500).send("Error al eliminar el método de pago.");
                    if (result.affectedRows === 0) return res.status(404).send("Método de pago no encontrado.");
                    res.send("Método de pago eliminado exitosamente.");
                }
            );
        });
    },
};
