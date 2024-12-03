// Importación de módulos necesarios
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;

// Función para generar token JWT
const generateToken = (userId, userRole) => {
    const payload = { userId, userRole }; // Incluye el ID_Rol
    const options = { expiresIn: process.env.JWT_EXPIRATION || "1h" };
    return jwt.sign(payload, process.env.JWT_SECRET, options);
};


module.exports = {
    // Función para registrar un nuevo usuario
    registerUser: async (req, res) => {
        const { Nombre, Email, Contraseña, ConfirmarContraseña, Telefono, Ciudad, CodPostal, Direccion } = req.body;

        // Validaciones
        if (!Nombre || !Email || !Contraseña || !ConfirmarContraseña || !Telefono || !Ciudad || !CodPostal || !Direccion) {
            return res.status(400).send("Todos los campos son obligatorios.");
        }
        if (Contraseña !== ConfirmarContraseña) {
            return res.status(400).send("Las contraseñas no coinciden.");
        }
        if (!/^[0-9]{10}$/.test(Telefono)) {
            return res.status(400).send("El número de teléfono debe tener 10 dígitos.");
        }
        if (!/^[0-9]{6}$/.test(CodPostal)) {
            return res.status(400).send("El código postal debe tener 6 dígitos.");
        }

        try {
            // Encriptar la contraseña
            const hashedPassword = await bcrypt.hash(Contraseña, 10);

            const newUser = {
                Nombre,
                Email,
                Contraseña: hashedPassword,
                Telefono,
                Ciudad,
                CodPostal,
                Direccion,
                ID_Rol: 3
            };

            req.getConnection((err, conn) => {
                if (err) return res.status(500).send("Error de conexión a la base de datos.");

                conn.query("INSERT INTO Usuario SET ?", [newUser], (err) => {
                    if (err && err.code === "ER_DUP_ENTRY") {
                        return res.status(400).send("El correo ya está registrado.");
                    }
                    return res.status(201).json({ message: "Usuario registrado exitosamente." });
                });
            });
        } catch (error) {
            return res.status(500).send("Error en el registro del usuario.");
        }
    },

    // Función para iniciar sesión
    loginUser: async (req, res) => {
        const { Email, Contraseña } = req.body;

        if (!Email || !Contraseña) {
            return res.status(400).send("Correo y contraseña son obligatorios.");
        }

        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");

            conn.query("SELECT * FROM Usuario WHERE Email = ?", [Email], async (err, rows) => {
                if (err || rows.length === 0) return res.status(401).send("Correo o contraseña incorrectos.");

                const user = rows[0];
                const passwordMatch = await bcrypt.compare(Contraseña, user.Contraseña);


                if (!passwordMatch) return res.status(401).send("Correo o contraseña incorrectos.");

                const token = generateToken(user.ID_Usuario, user.ID_Rol);

                // Enviar todos los datos del usuario junto con el token
                res.json({
                    ...user,   // Esto incluye todos los datos del usuario
                    token      // Incluye el token en la respuesta
                });
            });
        });
    },

    // Función para obtener todos los usuarios (Admin o Empleado)
    getAllUsers: (req, res) => {
        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");

            conn.query(`SELECT 
                        ID_Usuario, 
                        Nombre, 
                        Email, 
                        Telefono, 
                        Ciudad, 
                        CodPostal, 
                        Direccion,
                        Estado, 
                        FotoPerfil, 
                        ID_Rol
                    FROM 
                        Usuario;`, (err, rows) => {
                if (err) return res.status(500).send("Error al obtener los usuarios.");
                res.json(rows);
            });
        });
    },

    // Función para obtener un usuario por ID (Admin o Empleado)
    getUserById: (req, res) => {
        const userId = req.params.id;

        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");

            conn.query("SELECT * FROM Usuario WHERE ID_Usuario = ?", [userId], (err, rows) => {
                if (err || rows.length === 0) return res.status(404).send("Usuario no encontrado.");
                res.json(rows[0]);
            });
        });
    },

    // Función para actualizar la imagen de perfil
    updateProfilePhoto: (req, res) => {
        const userId = req.userId;

        if (!req.files || !req.files.FotoPerfil) {
            return res.status(400).send("No se ha subido ninguna imagen.");
        }

        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");

            conn.query("SELECT PublicId FROM Usuario WHERE ID_Usuario = ?", [userId], (err, rows) => {
                if (err || rows.length === 0) return res.status(404).send("Usuario no encontrado.");

                const oldPublicId = rows[0].PublicId;
                const profilePhoto = req.files.FotoPerfil;

                // Eliminar la imagen anterior de Cloudinary
                const deleteOldImage = oldPublicId ? cloudinary.uploader.destroy(oldPublicId) : Promise.resolve();

                deleteOldImage.then(() => {
                    cloudinary.uploader.upload(profilePhoto.tempFilePath, { folder: "PerfilPhotos" }, (error, result) => {
                        if (error) return res.status(500).send("Error al subir la imagen a Cloudinary.");

                        const updatedData = {
                            FotoPerfil: result.secure_url,
                            PublicId: result.public_id,
                        };

                        conn.query("UPDATE Usuario SET ? WHERE ID_Usuario = ?", [updatedData, userId], (err) => {
                            if (err) return res.status(500).send("Error al actualizar la imagen de perfil en la base de datos.");
                            res.send("Imagen de perfil actualizada correctamente.");
                        });
                    });
                }).catch((error) => {
                    console.error(error);
                    res.status(500).send("Error al eliminar la imagen anterior de Cloudinary.");
                });
            });
        });
    },

    // Función para activar o inactivar un usuario (Admin o Empleado)
    toggleUserStatus: (req, res) => {
        const userId = req.params.id;
        const { Estado } = req.body;

        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");

            conn.query("UPDATE Usuario SET Estado = ? WHERE ID_Usuario = ?", [Estado, userId], (err) => {
                if (err) return res.status(500).send("Error al actualizar el estado del usuario.");
                res.send(`Usuario ${Estado.toLowerCase()} correctamente.`);
            });
        });
    },

    // Función para actualizar el rol de un usuario (Admin o Empleado)
    updateUserRole: (req, res) => {
        const { userRole } = req;

        const userId = req.params.id;
        const { ID_Rol } = req.body;

        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");

            conn.query("UPDATE Usuario SET ID_Rol = ? WHERE ID_Usuario = ?", [ID_Rol, userId], (err) => {
                if (err) return res.status(500).send("Error al actualizar el rol del usuario.");
                res.send("Rol del usuario actualizado correctamente.");
            });
        });
    },

    // Función para cambiar la contraseña
    changePassword: async (req, res) => {
        const userId = req.userId;
        const { ContraseñaActual, NuevaContraseña, ConfirmarNuevaContraseña } = req.body;

        if (!ContraseñaActual || !NuevaContraseña || !ConfirmarNuevaContraseña) {
            return res.status(400).send("Todos los campos son obligatorios."); // Mensaje de error claro
        }

        if (NuevaContraseña !== ConfirmarNuevaContraseña) {
            return res.status(400).send("Las nuevas contraseñas no coinciden.");
        }

        if (NuevaContraseña.length < 8) {
            return res.status(400).send("La nueva contraseña debe tener al menos 8 caracteres.");
        }

        try {
            req.getConnection((err, conn) => {
                if (err) return res.status(500).send("Error de conexión a la base de datos.");

                conn.query("SELECT Contraseña FROM Usuario WHERE ID_Usuario = ?", [userId], async (err, rows) => {
                    if (err || rows.length === 0) {
                        return res.status(404).send("Usuario no encontrado.");
                    }

                    const user = rows[0];
                    const passwordMatch = await bcrypt.compare(ContraseñaActual, user.Contraseña);

                    if (!passwordMatch) {
                        return res.status(401).send("La contraseña actual es incorrecta.");
                    }

                    const hashedNewPassword = await bcrypt.hash(NuevaContraseña, 10);

                    conn.query(
                        "UPDATE Usuario SET Contraseña = ? WHERE ID_Usuario = ?",
                        [hashedNewPassword, userId],
                        (err) => {
                            if (err) return res.status(500).send("Error al actualizar la contraseña.");
                            res.send("Contraseña actualizada correctamente.");
                        }
                    );
                });
            });
        } catch (error) {
            return res.status(500).send("Error al procesar la solicitud.");
        }
    },

    // Función para actualizar los datos del perfil del usuario
    updateUserProfile: (req, res) => {
        const userId = req.userId;
        const { Nombre, Email, Telefono, Ciudad, CodPostal, Direccion } = req.body;

        // Validación de campos obligatorios
        if (!Nombre || !Email || !Telefono || !Ciudad || !CodPostal || !Direccion) {
            return res.status(400).send("Todos los campos son obligatorios.");
        }

        // Validaciones específicas
        if (!/^[0-9]{10}$/.test(Telefono)) {
            return res.status(400).send("El número de teléfono debe tener 10 dígitos.");
        }
        if (!/^[0-9]{6}$/.test(CodPostal)) {
            return res.status(400).send("El código postal debe tener 6 dígitos.");
        }

        // Validar si el correo ya está registrado
        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");

            conn.query("SELECT * FROM Usuario WHERE Email = ? AND ID_Usuario != ?", [Email, userId], (err, rows) => {
                if (err) return res.status(500).send("Error al comprobar el correo.");
                if (rows.length > 0) {
                    return res.status(400).send("El correo electrónico ya está registrado.");
                }

                // Datos a actualizar
                const updatedData = { Nombre, Email, Telefono, Ciudad, CodPostal, Direccion };

                conn.query("UPDATE Usuario SET ? WHERE ID_Usuario = ?", [updatedData, userId], (err, result) => {
                    if (err) {
                        return res.status(500).send("Error al actualizar los datos del usuario.");
                    }

                    if (result.affectedRows === 0) {
                        return res.status(404).send("Usuario no encontrado.");
                    }

                    res.send("Datos del usuario actualizados correctamente.");
                });
            });
        });
    },

    // Función para eliminar un usuario (solo Admin)
    deleteUser: (req, res) => {
        const userId = req.params.id;

        req.getConnection((err, conn) => {
            if (err) return res.status(500).send("Error de conexión a la base de datos.");

            conn.query("DELETE FROM Usuario WHERE ID_Usuario = ?", [userId], (err, result) => {
                if (err) return res.status(500).send("Error al eliminar el usuario.");
                if (result.affectedRows === 0) return res.status(404).send("Usuario no encontrado.");

                res.send("Usuario eliminado correctamente.");
            });
        });
    },
};
