require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const issuerRoutes = require("./routes/issuerRoutes");
const userRoutes = require("./routes/userRoutes");
const verificationRoutes = require("./routes/verificationRoutes");
const developerRoutes = require("./routes/developerRoutes");
const aiRoutes = require("./routes/aiRoutes");
const adminRoutes = require("./routes/adminRoutes");

const {
  encryptedResponse,
  createEncryptedApiWrapper,
} = require("./middleware/encryptedApiWrapper");

const app = express();
const isProduction = process.env.NODE_ENV === "production";

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 20 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many login/register attempts. Please try again later.",
  },
});

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 120 : 2000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "GET" || req.method === "OPTIONS",
  message: {
    success: false,
    error: "Too many write requests. Please slow down and try again.",
  },
});

app.use(encryptedResponse);
app.use("/api", createEncryptedApiWrapper(app));

app.get("/", (_req, res) => {
  res.send("TrustChain API Running");
});

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    status: "Backend Running",
    aiEnabled: String(process.env.USE_AI || "false") === "true",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", writeLimiter, adminRoutes);
app.use("/api/issuer", writeLimiter, issuerRoutes);
app.use("/api/verification", writeLimiter, verificationRoutes);

app.use("/api/user", userRoutes);
app.use("/api/developer", developerRoutes);
app.use("/api/ai", aiRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
