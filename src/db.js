const mysql = require("mysql2");

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Mrunal@27",
    database: "college_resource_reservation"
});

db.connect((err) => {
    if (err) {
        console.log("Database connection failed:", err.message);
    } else {
        console.log("MySQL database connected successfully");
    }
});

module.exports = db;