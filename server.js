const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express();
app.use(express.json());

// 🧱 Conexión MySQL
const db = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Crear tabla si no existe
db.query(`
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  password TEXT
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
        nombre: user.email
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
    if (err) return res.send("❌ DB ERROR");
    res.send("✅ DB OK");
  });
});