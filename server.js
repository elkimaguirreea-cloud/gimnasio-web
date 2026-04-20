const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const path = require("path");

const app = express();
app.use(express.json());

// 🧱 Base de datos
const mysql = require("mysql2");

const db = mysql.createConnection({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT
});

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
  const { email, password } = req.body;

  const hash = await bcrypt.hash(password, 10);

  db.query(
    "INSERT INTO usuarios (email, password) VALUES (?, ?)",
    [email, hash],
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

  db.get(
    "SELECT * FROM usuarios WHERE email = ?",
    [email],
    async (err, user) => {

      if (err) {
        return res.json({ mensaje: "Error en el servidor" });
      }

      if (!user) {
        return res.json({ mensaje: "Credenciales incorrectas" });
      }

      const valido = await bcrypt.compare(password, user.password);

      if (!valido) {
        return res.json({ mensaje: "Credenciales incorrectas" });
      }

      // ✅ Login correcto
      res.json({
        mensaje: "Login correcto",
        nombre: user.email // puedes cambiar esto luego
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