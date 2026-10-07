require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

async function importSchema() {
  console.log("=========================================");
  console.log("   Importing Database Schema into MySQL");
  console.log("=========================================");

  const schemaPath = path.join(__dirname, "schema.sql");
  if (!fs.existsSync(schemaPath)) {
    console.error("❌ schema.sql file not found!");
    process.exit(1);
  }

  const sql = fs.readFileSync(schemaPath, "utf-8");

  try {
    console.log(`Connecting to ${process.env.DB_HOST}...`);
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 3306,
      multipleStatements: true,
      connectTimeout: 10000,
      family: 4
    });

    console.log("✅ Connected! Executing schema.sql queries...");
    await connection.query(sql);
    console.log("✅ Schema imported successfully!");

    // Verify created tables
    await connection.changeUser({ database: process.env.DB_NAME || "college_resource_reservation" });
    const [tables] = await connection.query("SHOW TABLES;");
    const tableNames = tables.map((r) => Object.values(r)[0]);
    console.log(`📋 Verified tables in database: ${tableNames.join(", ")}`);

    await connection.end();
    console.log("🎉 Database setup complete!");
  } catch (error) {
    console.error("❌ Failed to import schema:", error.message);
    process.exit(1);
  }
}

importSchema();
