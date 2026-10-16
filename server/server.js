

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

function createToken(user) {
  return jwt.sign(
    { id: user.id, userId: user.user_id },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );
}

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ")
    ? header.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ message: "Please log in first" });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

app.get("/", (req, res) => {
  res.send("Clean Air Pharma API is running!");
});

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      success: true,
      message: "Clean Air Pharma API is running",
      database: "connected",
    });
  } catch (error) {
    console.error("Database health check failed:", error.message);
    res.status(500).json({
      success: false,
      database: "disconnected",
    });
  }
});

// Register a new user
app.post("/api/auth/register", async (req, res) => {
  try {
    const { userId, name, password } = req.body;

    if (
      typeof userId !== "string" ||
      typeof name !== "string" ||
      typeof password !== "string" ||
      !userId.trim() ||
      !name.trim() ||
      password.length < 8 ||
      password.length > 72
    ) {
      return res.status(400).json({
        message: "Enter a user ID, name, and password of 8–72 characters",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (user_id, name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, name`,
      [userId.trim(), name.trim(), passwordHash]
    );

    const user = result.rows[0];

    res.status(201).json({
      message: "Registration successful",
      user,
      token: createToken(user),
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "That user ID already exists" });
    }

    console.error("Registration error:", error.message);
    res.status(500).json({ message: "Could not register user" });
  }
});

// Log in using credentials stored in PostgreSQL
app.post("/api/auth/login", async (req, res) => {
  try {
    const { userId, password } = req.body;

    if (
      typeof userId !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({ message: "Enter user ID and password" });
    }

    const result = await pool.query(
      "SELECT id, user_id, name, password_hash FROM users WHERE user_id = $1",
      [userId.trim()]
    );

    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: "Invalid user ID or password" });
    }

    res.json({
      message: "Login successful",
      user: { id: user.id, user_id: user.user_id, name: user.name },
      token: createToken(user),
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ message: "Could not log in" });
  }
});

// Generate and store a simulated cleanroom sensor reading
app.get("/api/sensors", async (req, res) => {
  try {
    const reading = {
      temperature: +(22 + Math.random() * 2).toFixed(1),
      humidity: +(40 + Math.random() * 10).toFixed(1),
      pressure: +(12 + Math.random() * 6).toFixed(1),
      airQuality: Math.round(90 + Math.random() * 9),
      room: "Cleanroom A",
    };

    const result = await pool.query(
      `INSERT INTO sensor_readings
       (temperature, humidity, pressure, air_quality, room)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, temperature, humidity, pressure, air_quality, room, timestamp`,
      [
        reading.temperature,
        reading.humidity,
        reading.pressure,
        reading.airQuality,
        reading.room,
      ]
    );

    const row = result.rows[0];

    res.json({
      success: true,
      data: {
        id: row.id,
        temperature: Number(row.temperature),
        humidity: Number(row.humidity),
        pressure: Number(row.pressure),
        airQuality: row.air_quality,
        room: row.room,
        timestamp: row.timestamp,
      },
    });
  } catch (error) {
    console.error("Sensor database error:", error.message);
    res.status(500).json({ message: "Could not save sensor reading" });
  }
});

// Retrieve the latest 20 readings from PostgreSQL
app.get("/api/sensors/history", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, temperature, humidity, pressure,
              air_quality, room, timestamp
       FROM sensor_readings
       ORDER BY timestamp DESC, id DESC
       LIMIT 20`
    );

    const data = result.rows.map((row) => ({
      id: row.id,
      temperature: Number(row.temperature),
      humidity: Number(row.humidity),
      pressure: Number(row.pressure),
      airQuality: row.air_quality,
      room: row.room,
      timestamp: row.timestamp,
    }));

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    console.error("History error:", error.message);
    res.status(500).json({ message: "Could not retrieve sensor history" });
  }
});

async function startServer() {
  try {
    if (!process.env.JWT_SECRET ||
        process.env.JWT_SECRET === "replace_with_a_long_random_secret") {
      throw new Error("Set a private, random JWT_SECRET in .env first");
    }

    await pool.query("SELECT 1");
    console.log("PostgreSQL connected successfully!");

    app.listen(PORT, () => {
      console.log(`API running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
