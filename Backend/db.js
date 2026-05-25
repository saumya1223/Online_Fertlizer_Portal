const mysql = require("mysql2");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "fertilizer_portal",
  port: Number(process.env.DB_PORT || 3306),
});

db.connect((err) => {
  if (err) {
    console.error("MySQL connection error:", err.message);
    return;
  }
  console.log("MySQL connected");
});

module.exports = db;
