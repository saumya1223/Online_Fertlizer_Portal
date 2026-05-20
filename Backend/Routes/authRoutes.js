const express = require("express");
const router = express.Router();

const db = require("../db");
const jwt = require("jsonwebtoken");
const { generateOTP } = require("../utils/otp");
const transporter = require("../utils/emailService");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const SECRET = process.env.JWT_SECRET;

/* ---------------------------------------
   TEMP STORAGE
----------------------------------------- */
global.signupOTP = null;
global.signupEmail = null;
global.loginOTP = null;
global.loginEmail = null;

/* ---------------------------------------
   SEND SIGNUP OTP
----------------------------------------- */
router.post("/signup/send-otp", (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email required" });
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return res.status(500).json({ message: "Server email config missing in .env" });
  }

  const otp = generateOTP();
  global.signupOTP = otp;
  global.signupEmail = email;

  transporter.sendMail(
    {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Signup OTP",
      text: `Your Signup OTP is: ${otp}`,
    },
    (err, info) => {
      if (err) {
        console.log("❌ Signup Email Error:", err);
        return res.status(500).json({ message: `Email sending failed: ${err.message}` });
      }

      console.log("Signup OTP sent:", otp);
      res.json({ message: "OTP sent successfully" });
    }
  );
});

/* ---------------------------------------
   VERIFY SIGNUP OTP
----------------------------------------- */
router.post("/signup/verify", (req, res) => {
  const { name, email, phone, address, area, password, otp } = req.body;

  if (otp !== global.signupOTP || email !== global.signupEmail)
    return res.status(401).json({ message: "Invalid OTP" });

  const checkSql = "SELECT * FROM users WHERE email = ? OR phone = ?";
  db.query(checkSql, [email, phone], (err, result) => {
    if (err) return res.status(500).json({ message: "Database error" });

    if (result.length > 0)
      return res.status(409).json({ message: "Email or Phone already exists!" });

    const insertSql =
      "INSERT INTO users (name, email, phone, address, area, password) VALUES (?, ?, ?, ?, ?, ?)";

    db.query(
      insertSql,
      [name, email, phone, address, area, password],
      (err2) => {
        if (err2) return res.status(500).json({ message: "Insert failed" });

        global.signupOTP = null;
        global.signupEmail = null;

        res.json({ message: "Signup completed" });
      }
    );
  });
});

/* ---------------------------------------
   SEND LOGIN OTP
----------------------------------------- */
router.post("/login/send-otp", (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email required" });
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return res.status(500).json({ message: "Server email config missing in .env" });
  }

  const otp = generateOTP();
  global.loginOTP = otp;
  global.loginEmail = email;

  transporter.sendMail(
    {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Login OTP",
      text: `Your Login OTP is: ${otp}`,
    },
    (err, info) => {
      if (err) {
        console.log("❌ Login Email Error:", err);
        return res.status(500).json({ message: `Email sending failed: ${err.message}` });
      }

      console.log("Login OTP sent:", otp);
      res.json({ message: "OTP sent successfully" });
    }
  );
});

/* ---------------------------------------
   VERIFY LOGIN OTP
----------------------------------------- */
router.post("/login/verify", (req, res) => {
  const { email, otp } = req.body;

  if (otp !== global.loginOTP || email !== global.loginEmail)
    return res.status(401).json({ message: "Invalid OTP" });

  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], (err, result) => {
    if (err) return res.status(500).json({ message: "Database Error" });

    if (result.length === 0)
      return res.status(404).json({ message: "User not found" });

    const user = result[0];

    const token = jwt.sign({ email: user.email }, SECRET, {
      expiresIn: "1h",
    });

    global.loginOTP = null;
    global.loginEmail = null;

    res.json({
      message: "Login successful",
      token,
      user,
    });
  });
});

module.exports = router;
