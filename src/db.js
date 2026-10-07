const dns = require("dns");
// Prioritize IPv4 to prevent IPv6 timeout issues with AWS RDS
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder("ipv4first");
}

require("dotenv").config();
const mysql = require("mysql2");

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
});

db.getConnection((err, connection) => {
    if (err) {
        console.log("Database connection failed:", err.message);
    } else {
        console.log("MySQL AWS RDS connected successfully");
        connection.release();
    }
});

module.exports = db;