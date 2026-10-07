require("dotenv").config();
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const dns = require("dns");

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

async function seedData() {
  console.log("==================================================");
  console.log("      Seeding Sample Data to AWS RDS MySQL        ");
  console.log("==================================================");

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306,
      connectTimeout: 10000,
    });

    console.log("✅ Connected to AWS RDS MySQL.");

    // Hash passwords
    const adminPassword = await bcrypt.hash("Admin@123", 10);
    const userPassword = await bcrypt.hash("User@123", 10);

    // 1. Seed Users
    console.log("Adding users...");
    await connection.query(`
      INSERT INTO users (name, email, password, role)
      VALUES 
        ('Admin User', 'admin@college.edu', ?, 'admin'),
        ('Student User', 'student@college.edu', ?, 'user')
      ON DUPLICATE KEY UPDATE name=VALUES(name);
    `, [adminPassword, userPassword]);

    // 2. Seed Resources
    console.log("Adding resources...");
    await connection.query(`
      INSERT INTO resources (name, type, capacity, location, facilities, status)
      VALUES 
        ('Seminar Hall A', 'Hall', 150, 'Building 1, Floor 2', 'Projector, AC, Sound System', 'available'),
        ('Computer Lab 3', 'Lab', 40, 'IT Block, Floor 1', 'High-end PCs, Gigabit LAN, AC', 'available'),
        ('Conference Room B', 'Room', 20, 'Admin Block, Ground Floor', 'Smart TV, Video Conference, Whiteboard', 'available'),
        ('Auditorium Main', 'Auditorium', 500, 'Main Campus, Ground Floor', 'Stage Lights, Dolby Sound, Podium', 'available'),
        ('Physics Lab 1', 'Lab', 30, 'Science Wing, Floor 3', 'Lab Equipment, Optical Benches, AC', 'available')
      ON DUPLICATE KEY UPDATE status=VALUES(status);
    `);

    // 3. Seed Sample Notifications
    console.log("Adding notifications...");
    const [userRows] = await connection.query("SELECT id FROM users WHERE email = 'student@college.edu';");
    if (userRows.length > 0) {
      const studentId = userRows[0].id;
      await connection.query(`
        INSERT INTO notifications (user_id, message, is_read)
        VALUES 
          (?, 'Welcome to College Resource Reservation System!', 0)
      `, [studentId]);
    }

    console.log("🎉 Sample data inserted successfully!");
    await connection.end();
  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
  }
}

seedData();
