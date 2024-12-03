//Codigos para la gestion de la tabla roles

module.exports = {
    //Funcion para crear un nuevo rol
    createRol: (req, res) => {
        //Verificar que el usuario tiene rol de administrador
        //Se desactiva para hacer pruebas en postman
        /*if (req.userRole !== 1) {
            return res.status(403).send("Acceso denegado");
        }*/

        const { ID_Rol, TipoRol } = req.body;

        //Conexion a la base de datos
        req.getConnection((err, conn) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Error de conexion a la base de datos.");
            }

            //Verificar que el rol es uno de los predefinidos (1, 2, o 3)
            const rolesPermitidos = [1, 2, 3];
            if (!rolesPermitidos.includes(ID_Rol)) {
                return res.status(400).send("ID de rol inválido. Solo se permiten los roles predefinidos (1=Administrador, 2=Empleado, 3=Cliente).");
            }

            //Insertar el nuevo rol en la base de datos
            const newRol = { ID_Rol, TipoRol };
            conn.query("INSERT INTO Rol SET ?", [newRol], (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send("Error al crear el rol en la base de datos.");
                }
                res.status(201).send("Rol creado correctamente.");
            });
        });
    },

    //Funcion para obtener todos los roles
    getRoles: (req, res) => {
        //Verificar que el usuario tiene rol de administrador
        //Se comenta para haacer pruevas en postman
        /*if (req.userRole !== 1) {
            return res.status(403).send("Acceso denegado");
        } */

        // Conexión a la base de datos
        req.getConnection((err, conn) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Error de conexión a la base de datos.");
            }

            // Consultar todos los roles
            conn.query("SELECT * FROM Rol", (err, rows) => {
                if (err){
                    console.error(err);
                    return res.status(500).send("Error al obtener los roles.");
                }
                res.json(rows); //Envia la lista de roles en formato JSON
            });
        });
    },

    //Funcion para obtener un rol por su ID
    getRolById: (req, res) => {
        const rolId = req.params.id;

        //Verifica que el usuario tiene rol de administrador
        //Se desactiva para hacer pruebas en postman
        /*if (req.userRole !== 1) {
            return res.status(403).send("Acceso denegado");
        } */

        //Conexion a la base de datos
        req.getConnection((err, conn) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Error de conexion a la base de datos.");
            }

            //Consultar el rol por ID
            conn.query("SELECT * FROM Rol WHERE ID_Rol = ?", [rolId], (err, rows) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send("Error al obtener el rol.");
                }
                if (rows.length === 0) {
                    return res.status(404).send("Rol no encontrado.");
                }
                res.json(rows[0]); //Envia el rol encontrado en formato JSON
            });
        });
    }
}