// src/config/db.ts
import { Pool } from "pg";
import dotenv from "dotenv";

// ── Configuration
dotenv.config();

// ── SSL
// Decided by the database host, not NODE_ENV. Running the backend locally
// against the hosted Railway Postgres goes through its public proxy, which
// resets plaintext connections (ECONNRESET on read). Only a genuinely local
// database should connect without SSL.
function shouldUseSsl(): boolean {
  const url = process.env.DATABASE_URL;
  if (url) {
    try {
      const host = new URL(url).hostname;
      const isLocalHost =
        host === "localhost" || host === "127.0.0.1" || host === "[::1]";
      return !isLocalHost;
    } catch {
      // Unparseable URL — fall through to the NODE_ENV rule below.
    }
  }
  return (
    process.env.NODE_ENV === "production" || process.env.NODE_ENV === "script"
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: shouldUseSsl() ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  // New connections through Railway's public proxy (local dev) often take
  // more than 2 s; a short limit turned slow connects into 500s.
  connectionTimeoutMillis: 10000,
});

// ── Event handlers
if (process.env.NODE_ENV !== "script") {
  pool.on("connect", () => {
    console.log("✅ Connected to PostgreSQL");
  });
}

pool.on("error", (err) => {
  console.error("❌ PostgreSQL pool error (idle client removed):", err);
});

// ── Export
export default pool;
