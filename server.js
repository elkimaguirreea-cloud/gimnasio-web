const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const path = require("path");

const app = express();
app.use(express.json());

// 🧱 Base de datos
const db = new sqlite3.Database("usuarios.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT,
      apellido TEXT,
      email TEXT UNIQUE,
      password TEXT
    )
  `);
});

// 🌐 Servir frontend
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 📝 REGISTRO
app.post("/registro", async (req, res) => {
  const { email, password } = req.body;

  const hash = await bcrypt.hash(password, 10);

  db.run(
    "INSERT INTO usuarios (email, password) VALUES (?, ?)",
    [email, hash],
    (err) => {
      if (err) {
        if (err.message.includes("UNIQUE")) {
          return res.send("Este correo ya está registrado");
        }
        return res.send("Error al registrar");
      }

      res.send("Usuario registrado");
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
app.listen(3000, () => {
  console.log("Servidor en http://localhost:3000");
});

// 🛑 Capturar errores
process.on("uncaughtException", (err) => {
  console.error("Error detectado:", err);
});