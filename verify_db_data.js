require("dotenv").config();
const mysql = require("mysql2/promise");
const dns = require("dns");

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

async function verifyDatabase() {
  console.log("==================================================");
  console.log("   AWS RDS Database Content & Schema Inspector    ");
  console.log("==================================================");
  console.log(`Connecting to: ${process.env.DB_HOST}`);
  console.log(`Database:      ${process.env.DB_NAME}`);
  console.log("--------------------------------------------------");

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306,
      connectTimeout: 10000,
    });

    const tables = ["users", "resources", "reservations", "notifications"];

    for (const table of tables) {
      console.log(`\n================== [ TABLE: ${table.toUpperCase()} ] ==================`);
      
      // 1. Show Columns
      const [columns] = await connection.query(`DESCRIBE ${table};`);
      console.log("COLUMNS:");
      console.table(columns.map(c => ({
        Field: c.Field,
        Type: c.Type,
        Null: c.Null,
        Key: c.Key,
        Default: c.Default
      })));

      // 2. Show Rows
      const [rows] = await connection.query(`SELECT * FROM ${table};`);
      console.log(`ROWS COUNT: ${rows.length}`);
      if (rows.length > 0) {
        console.table(rows);
      } else {
        console.log(`(Table '${table}' is currently empty)`);
      }
    }

    await connection.end();
    console.log("\n==================================================");
    console.log("✅ All tables, columns, and rows inspected successfully!");
    console.log("==================================================");
  } catch (error) {
    console.error("❌ Inspection failed:", error.message);
  }
}

verifyDatabase();
