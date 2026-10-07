require("dotenv").config();
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const dns = require("dns");

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

async function resetPasswords() {
  console.log("Connecting to AWS RDS...");
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306,
      connectTimeout: 10000,
    });

    console.log("Connected to RDS.");

    const adminHash = await bcrypt.hash("Admin@123", 10);
    const studentHash = await bcrypt.hash("User@123", 10);

    // Update Admin
    await connection.query(
      "UPDATE users SET password = ?, role = 'admin' WHERE email = 'admin@college.edu'",
      [adminHash]
    );

    // Update or Insert Student
    const [res] = await connection.query(
      "UPDATE users SET password = ?, role = 'user' WHERE email = 'student@college.edu'",
      [studentHash]
    );

    if (res.affectedRows === 0) {
      await connection.query(
        "INSERT INTO users (name, email, password, role) VALUES ('Student User', 'student@college.edu', ?, 'user')",
        [studentHash]
      );
    }

    console.log("✅ Successfully updated passwords:");
    console.log("1. admin@college.edu   -> Admin@123 (role: admin)");
    console.log("2. student@college.edu -> User@123  (role: user)");

    // Verify
    const [users] = await connection.query("SELECT id, name, email, role FROM users;");
    console.table(users);

    await connection.end();
  } catch (err) {
    console.error("Error:", err.message);
  }
}

resetPasswords();
