import bcrypt from "bcryptjs";
import pool from "../config/db";
import dotenv from "dotenv";
import readline from "readline";

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt: string): Promise<string> =>
  new Promise((resolve) => rl.question(prompt, resolve));

const createAdmin = async () => {
  try {
    const email = await question("Email: ");
    const firstName = await question("First Name: ");
    const lastName = await question("Last Name: ");
    const password = await question("Password (min 8 chars): ");

    // ← validate inputs
    if (!email || !firstName || !lastName || !password) {
      console.error("❌ All fields are required.");
      process.exit(1);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      console.error("❌ Invalid email format.");
      process.exit(1);
    }

    if (password.length < 8) {
      console.error("❌ Password must be at least 8 characters.");
      process.exit(1);
    }

    // ← check if email already exists
    const existing = await pool.query(
      `SELECT id FROM admins WHERE email = $1`,
      [email.trim().toLowerCase()],
    );

    if (existing.rows.length > 0) {
      console.error("❌ An admin with this email already exists.");
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 12); // ← always use 12 rounds for admin

    const result = await pool.query(
      `INSERT INTO admins (email, password, first_name, last_name, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING id, email, first_name, last_name, status, created_at`,
      [
        email.trim().toLowerCase(),
        hashedPassword,
        firstName.trim(),
        lastName.trim(),
      ],
    );

    const admin = result.rows[0];
  } catch (err) {
    console.error("❌ Error creating admin:", err);
    process.exit(1);
  } finally {
    rl.close();
    await pool.end();
  }
};

createAdmin();
