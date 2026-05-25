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
const OTP_TABLE = "otp_codes";

function queryAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function setOtpRecordInMemory(kind, email, otp) {
  otpStore.set(`${kind}:${normalizeEmail(email)}`, {
    otp: String(otp),
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
  });
}

function verifyOtpRecordInMemory(kind, email, otp) {
  const key = `${kind}:${normalizeEmail(email)}`;
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

async function ensureOtpTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS ${OTP_TABLE} (
      kind VARCHAR(20) NOT NULL,
      email VARCHAR(255) NOT NULL,
      otp VARCHAR(10) NOT NULL,
      expires_at BIGINT NOT NULL,
      attempts INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (kind, email)
    )
  `;
  await queryAsync(sql);
}

async function setOtpRecord(kind, email, otp) {
  const normalizedEmail = normalizeEmail(email);
  const expiresAt = Date.now() + OTP_TTL_MS;
  try {
    await queryAsync(
      `INSERT INTO ${OTP_TABLE} (kind, email, otp, expires_at, attempts)
       VALUES (?, ?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE otp = VALUES(otp), expires_at = VALUES(expires_at), attempts = 0, created_at = CURRENT_TIMESTAMP`,
      [kind, normalizedEmail, String(otp), expiresAt]
    );
  } catch (_error) {
    setOtpRecordInMemory(kind, normalizedEmail, otp);
  }
}

async function verifyOtpRecord(kind, email, otp) {
  const normalizedEmail = normalizeEmail(email);
  try {
    const rows = await queryAsync(
      `SELECT otp, expires_at, attempts FROM ${OTP_TABLE} WHERE kind = ? AND email = ?`,
      [kind, normalizedEmail]
    );

    if (!rows.length) return { ok: false, message: "OTP not found. Please request a new OTP." };

    const record = rows[0];

    if (Date.now() > Number(record.expires_at)) {
      await queryAsync(`DELETE FROM ${OTP_TABLE} WHERE kind = ? AND email = ?`, [kind, normalizedEmail]);
      return { ok: false, message: "OTP expired. Please request a new OTP." };
    }

    const nextAttempts = Number(record.attempts) + 1;
    if (nextAttempts > OTP_MAX_ATTEMPTS) {
      await queryAsync(`DELETE FROM ${OTP_TABLE} WHERE kind = ? AND email = ?`, [kind, normalizedEmail]);
      return { ok: false, message: "Too many failed attempts. Please request a new OTP." };
    }

    if (String(otp || "").trim() !== String(record.otp)) {
      await queryAsync(
        `UPDATE ${OTP_TABLE} SET attempts = ? WHERE kind = ? AND email = ?`,
        [nextAttempts, kind, normalizedEmail]
      );
      return { ok: false, message: "Invalid OTP" };
    }

    await queryAsync(`DELETE FROM ${OTP_TABLE} WHERE kind = ? AND email = ?`, [kind, normalizedEmail]);
    return { ok: true };
  } catch (_error) {
    return verifyOtpRecordInMemory(kind, normalizedEmail, otp);
  }
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
router.post("/signup/send-otp", async (req, res) => {
  const email = normalizeEmail(req.body?.email);

  if (!email) return res.status(400).json({ message: "Email required" });
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return res.status(500).json({ message: "Server email config missing in .env" });
  }

  const otp = generateOTP();
  await setOtpRecord("signup", email, otp);

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
router.post("/signup/verify", async (req, res) => {
  const { name, phone, address, area, password, otp } = req.body;
  const email = normalizeEmail(req.body?.email);
  if (!name || !email || !phone || !address || !area || !password || !otp) {
    return res.status(400).json({ message: "All fields including OTP are required" });
  }

  const otpResult = await verifyOtpRecord("signup", email, otp);
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
router.post("/login/send-otp", async (req, res) => {
  const email = normalizeEmail(req.body?.email);

  if (!email) return res.status(400).json({ message: "Email required" });
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return res.status(500).json({ message: "Server email config missing in .env" });
  }

  const otp = generateOTP();
  await setOtpRecord("login", email, otp);

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
router.post("/login/verify", async (req, res) => {
  const { otp } = req.body;
  const email = normalizeEmail(req.body?.email);
  if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });

  const otpResult = await verifyOtpRecord("login", email, otp);
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

ensureOtpTable().catch((err) => {
  console.error("OTP table init failed:", err.message);
});
