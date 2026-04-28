console.log("HOST:", process.env.MYSQLHOST);
console.log("USER:", process.env.MYSQLUSER);
const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express();
app.use(express.json());

// 🧱 Conexión MySQL
const db = mysql.createPool({
  host: "metro.proxy.rlwy.net",
  user: "root",
  password: "BaioOseNTRHTzyJYbPAyCJHcSFMxMxyk",
  database: "railway",
  port: 10179
});

// Crear tabla si no existe
db.query(`
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100),
  apellido VARCHAR(100),
  email VARCHAR(255) UNIQUE,
  password TEXT,
  rol VARCHAR(20) DEFAULT 'usuario'
)
`);

// 🌐 Servir frontend
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 📝 REGISTRO
app.post("/registro", async (req, res) => {
 const { email, password, nombre, apellido } = req.body;

  const hash = await bcrypt.hash(password, 10);

  db.query(
  "INSERT INTO usuarios (email, password, nombre, apellido) VALUES (?, ?, ?, ?)",
  [email, hash, nombre, apellido],
  (err) => {
    if (err) {
      return res.json({ mensaje: "El correo ya está registrado" });
    }
    res.json({ mensaje: "Usuario registrado" });
    }
  );
});

// 🔐 LOGIN
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.query(
    "SELECT * FROM usuarios WHERE email = ?",
    [email],
    async (err, results) => {

      if (err) {
        return res.json({ mensaje: "Error en el servidor" });
      }

      if (results.length === 0) {
        return res.json({ mensaje: "Credenciales incorrectas" });
      }

      const user = results[0];

      const valido = await bcrypt.compare(password, user.password);

      if (!valido) {
        return res.json({ mensaje: "Credenciales incorrectas" });
      }

      res.json({
        mensaje: "Login correcto",
        nombre: user.nombre,
        rol: user.rol

      });
    }
  );
});

// 🚀 Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor corriendo");
});

// 🛑 Capturar errores
process.on("uncaughtException", (err) => {
  console.error("Error detectado:", err);
});
db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Error conectando a MySQL:", err);
  } else {
    console.log("✅ MySQL conectado");
    connection.release();
  }
});
app.get("/test-db", (req, res) => {
  db.query("SELECT 1", (err) => {
    if (err) {
      console.error("ERROR REAL:", err);
      return res.send("❌ DB ERROR: " + err.message);
    }
    res.send("✅ DB OK");
  });
});

// Obtener usuarios
app.get("/usuarios", (req, res) => {
  db.query(
    "SELECT id, nombre, apellido, email, rol FROM usuarios",
    (err, results) => {
      if (err) {
        console.error(err);
        return res.json({ error: "Error al obtener usuarios" });
      }
      res.json(results);
    }
  );
});

// Guardar nuevos usuarios 

app.post("/usuarios", async (req, res) => {
  const { nombre, apellido, email, password, rol } = req.body;

  if (!nombre || !apellido || !email || !password) {
    return res.json({ mensaje: "Faltan datos" });
  }

  const hash = await bcrypt.hash(password, 10);

  db.query(
    "INSERT INTO usuarios (nombre, apellido, email, password, rol) VALUES (?, ?, ?, ?, ?)",
    [nombre, apellido, email, hash, rol],
    (err) => {
      if (err) {
        console.error(err);
        return res.json({ mensaje: "Error al registrar usuario" });
      }
      res.json({ mensaje: "Usuario creado correctamente" });
    }
  );
});

// Eliminar Usuarios

app.delete("/usuarios/:id", (req, res) => {
  const { id } = req.params;

  db.query(
    "SELECT email FROM usuarios WHERE id = ?",
    [id],
    (err, results) => {

      if (err) {
        console.error(err);
        return res.json({ mensaje: "Error del servidor" });
      }

      if (results.length === 0) {
        return res.json({ mensaje: "Usuario no encontrado" });
      }

      const email = results[0].email;

      // 🚫 BLOQUEAR EL ADMIN PRINCIPAL
      if (email === "admin@levelingfit.com") {
        return res.json({ mensaje: "No se puede eliminar el administrador principal" });
      }

      // ✅ eliminar si no es admin principal
      db.query(
        "DELETE FROM usuarios WHERE id = ?",
        [id],
        (err) => {
          if (err) {
            console.error(err);
            return res.json({ mensaje: "Error al eliminar" });
          }
          res.json({ mensaje: "Usuario eliminado" });
        }
      );
    }
  );});

// Actualizar Usuario

app.put("/usuarios/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre, apellido, email, password, rol } = req.body;

  try {
    let query;
    let params;

    // 🧠 Si el usuario escribió nueva contraseña → encriptar
    if (password && password.trim() !== "") {
      const hash = await bcrypt.hash(password, 10);

      query = `
        UPDATE usuarios 
        SET nombre=?, apellido=?, email=?, password=?, rol=? 
        WHERE id=?
      `;
      params = [nombre, apellido, email, hash, rol, id];

    } else {
      // 🧠 Si NO cambia contraseña → no tocarla
      query = `
        UPDATE usuarios 
        SET nombre=?, apellido=?, email=?, rol=? 
        WHERE id=?
      `;
      params = [nombre, apellido, email, rol, id];
    }

    db.query(query, params, (err) => {
      if (err) {
        console.error(err);
        return res.json({ mensaje: "Error al actualizar usuario" });
      }
      res.json({ mensaje: "Usuario actualizado correctamente" });
    });

  } catch (error) {
    console.error(error);
    res.json({ mensaje: "Error del servidor" });
  }
});