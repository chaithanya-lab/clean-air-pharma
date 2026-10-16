const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || "cleanair",
  user: process.env.PGUSER || process.env.USER,
  password: process.env.PGPASSWORD || undefined,
});

module.exports = pool;