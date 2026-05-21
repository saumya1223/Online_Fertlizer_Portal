const jwt = require("jsonwebtoken");

module.exports = function auth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const secret = process.env.JWT_SECRET;

  if (!token) return res.status(401).json({ error: "Unauthorized: token missing" });
  if (!secret) return res.status(500).json({ error: "Server auth config missing" });

  try {
    const payload = jwt.verify(token, secret);
    req.user = payload;
    return next();
  } catch (_err) {
    return res.status(401).json({ error: "Unauthorized: invalid or expired token" });
  }
};
