const mysql = require("mysql2");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "farming_app",
});

db.connect((err) => {
  if (err) console.log("DB Error:", err.message);
  else console.log("MySQL Connected");
});

module.exports = db;
