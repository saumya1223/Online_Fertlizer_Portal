const express = require("express");
const router = express.Router();
const crypto = require("crypto");

const db = require("../db");
const jwt = require("jsonwebtoken");
const { generateOTP } = require("../utils/otp");
const transporter = require("../utils/emailService");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const SECRET = process.env.JWT_SECRET;
const OTP_TTL_MS = Number(process.env.OTP_TTL_MS || 5 * 60 * 1000);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);
const otpStore = new Map();

function setOtpRecord(kind, email, otp) {
  otpStore.set(`${kind}:${email.toLowerCase()}`, {
    otp: String(otp),
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
  });
}

function verifyOtpRecord(kind, email, otp) {
  const key = `${kind}:${String(email || "").toLowerCase()}`;
  const record = otpStore.get(key);

  if (!record) return { ok: false, message: "OTP not found. Please request a new OTP." };
  if (Date.now() > record.expiresAt) {
    otpStore.delete(key);
    return { ok: false, message: "OTP expired. Please request a new OTP." };
  }

  record.attempts += 1;
  if (record.attempts > OTP_MAX_ATTEMPTS) {
    otpStore.delete(key);
    return { ok: false, message: "Too many failed attempts. Please request a new OTP." };
  }

  if (String(otp || "").trim() !== record.otp) {
    return { ok: false, message: "Invalid OTP" };
  }

  otpStore.delete(key);
  return { ok: true };
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: user.address,
    area: user.area,
  };
}

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
  setOtpRecord("signup", email, otp);

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
  if (!name || !email || !phone || !address || !area || !password || !otp) {
    return res.status(400).json({ message: "All fields including OTP are required" });
  }

  const otpResult = verifyOtpRecord("signup", email, otp);
  if (!otpResult.ok) return res.status(401).json({ message: otpResult.message });

  const checkSql = "SELECT * FROM users WHERE email = ? OR phone = ?";
  db.query(checkSql, [email, phone], (err, result) => {
    if (err) return res.status(500).json({ message: "Database error" });

    if (result.length > 0)
      return res.status(409).json({ message: "Email or Phone already exists!" });

    const insertSql =
      "INSERT INTO users (name, email, phone, address, area, password) VALUES (?, ?, ?, ?, ?, ?)";
    const hashedPassword = hashPassword(password);

    db.query(
      insertSql,
      [name, email, phone, address, area, hashedPassword],
      (err2) => {
        if (err2) return res.status(500).json({ message: "Insert failed" });

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
  setOtpRecord("login", email, otp);

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
  if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });

  const otpResult = verifyOtpRecord("login", email, otp);
  if (!otpResult.ok) return res.status(401).json({ message: otpResult.message });

  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], (err, result) => {
    if (err) return res.status(500).json({ message: "Database Error" });

    if (result.length === 0)
      return res.status(404).json({ message: "User not found" });

    const user = result[0];

    const token = jwt.sign({ email: user.email }, SECRET, {
      expiresIn: "1h",
    });

    res.json({
      message: "Login successful",
      token,
      user: sanitizeUser(user),
    });
  });
});

module.exports = router;
