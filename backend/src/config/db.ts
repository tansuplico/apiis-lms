// src/config/db.ts
import { Pool } from "pg";
import dotenv from "dotenv";

// ── Configuration
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: true }
      : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// ── Event handlers
if (process.env.NODE_ENV !== "script") {
  pool.on("connect", () => {
    console.log("✅ Connected to PostgreSQL");
  });
}

pool.on("error", (err) => {
  console.error("❌ PostgreSQL error:", err);
  process.exit(-1);
});

// ── Export
export default pool;
