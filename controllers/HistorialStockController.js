// Importación de módulos necesarios
module.exports = {
    // Función para consultar el historial de stock
    getHistorialStock: (req, res) => {
        const { ID_Producto } = req.params; // ID del producto (opcional)

        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");

            let query = "SELECT * FROM HistorialStock";
            const queryParams = [];

            // Filtrar por producto si se proporciona el ID
            if (ID_Producto) {
                query += " WHERE ID_Producto = ?";
                queryParams.push(ID_Producto);
            }

            conn.query(query, queryParams, (err, rows) => {
                if (err) return res.status(500).send("Error al consultar el historial de stock.");
                res.json(rows);
            });
        });
    }
};
