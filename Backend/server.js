const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const authRoutes = require("./Routes/authRoutes");
const aiRoutes = require("./Routes/aiRoutes");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });
require("./db");  // connects to MySQL

const app = express();

app.use(
  cors({
    origin: ["http://127.0.0.1:5500", "http://localhost:5500"],   // Live Server
    methods: ["GET", "POST"],
  })
);

app.use(express.json());

// Default API test
app.use("/api", routes);

// Authentication Routes (OTP, Login, Signup)
app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
