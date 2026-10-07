require("dotenv").config();
const mysql = require("mysql2/promise");

async function testConnection() {
  console.log("=========================================");
  console.log("   Testing MySQL Database Connection");
  console.log("=========================================");
  console.log(`Host:     ${process.env.DB_HOST || "(not set)"}`);
  console.log(`Port:     ${process.env.DB_PORT || 3306}`);
  console.log(`User:     ${process.env.DB_USER || "(not set)"}`);
  console.log(`Database: ${process.env.DB_NAME || "(not set)"}`);
  console.log("-----------------------------------------");

  if (!process.env.DB_HOST) {
    console.error("❌ ERROR: DB_HOST is not defined in your .env file.");
    process.exit(1);
  }

  try {
    console.log("⏳ Connecting to MySQL server...");
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 3306,
      connectTimeout: 10000, // 10s timeout
      family: 4
    });

    console.log("✅ Successfully reached MySQL host!");

    // Check databases
    const [dbRows] = await connection.query("SHOW DATABASES;");
    const databases = dbRows.map((r) => Object.values(r)[0]);
    console.log(`Available Databases: ${databases.join(", ")}`);

    const targetDb = process.env.DB_NAME;
    if (databases.includes(targetDb)) {
      console.log(`✅ Target database '${targetDb}' exists.`);
      await connection.changeUser({ database: targetDb });

      const [tables] = await connection.query("SHOW TABLES;");
      const tableNames = tables.map((r) => Object.values(r)[0]);
      console.log(`📋 Existing tables in '${targetDb}': ${tableNames.length > 0 ? tableNames.join(", ") : "(None yet - schema needs to be imported)"}`);
    } else {
      console.log(`⚠️ Database '${targetDb}' does NOT exist yet.`);
      console.log(`You can run: CREATE DATABASE ${targetDb}; or import schema.sql`);
    }

    await connection.end();
    console.log("-----------------------------------------");
    console.log("🎉 Test completed successfully!");
  } catch (error) {
    console.error("\n❌ Connection Failed!");
    console.error("Code:   ", error.code);
    console.error("Message:", error.message);
    console.log("\n💡 Troubleshooting Tips:");
    if (error.code === "ETIMEDOUT" || error.code === "ECONNREFUSED") {
      console.log("- For AWS RDS: Ensure your RDS Security Group allows Inbound traffic on port 3306 from your IP (or 0.0.0.0/0 for public testing).");
      console.log("- For AWS RDS: Ensure 'Publicly Accessible' is set to 'Yes' if connecting from outside AWS.");
    } else if (error.code === "ER_ACCESS_DENIED_ERROR") {
      console.log("- Check DB_USER and DB_PASSWORD in your .env file.");
    } else if (error.code === "ENOTFOUND") {
      console.log("- DB_HOST could not be resolved. Verify the AWS RDS endpoint address.");
    }
    process.exit(1);
  }
}

testConnection();
