import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import "dotenv/config";
import authRouter from "./routes/auth.js";
import profileRouter from "./routes/profile.js";
import skillsRouter from "./routes/skills.js";
import certificationsRouter from "./routes/certifications.js";
import attendanceRouter from "./routes/attendance.js";
import leavesRouter from "./routes/leaves.js";

const app = express();
const port = process.env.PORT || 5000;

// Enable CORS for Next.js dev server on port 3000
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// Logger Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// API Routes
app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/skills", skillsRouter);
app.use("/api/certifications", certificationsRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/leaves", leavesRouter);

// Health Check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error"
  });
});

app.listen(port, () => {
  console.log(`🚀 Dayflow Backend running on http://localhost:${port}`);
});
