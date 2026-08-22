import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import "dotenv/config";
import authRouter from "../src/routes/auth.js";
import profileRouter from "../src/routes/profile.js";
import skillsRouter from "../src/routes/skills.js";
import certificationsRouter from "../src/routes/certifications.js";
import attendanceRouter from "../src/routes/attendance.js";
import leavesRouter from "../src/routes/leaves.js";

const app = express();

// Enable CORS for Vercel frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// API Routes
app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/skills", skillsRouter);
app.use("/api/certifications", certificationsRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/leaves", leavesRouter);

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error"
  });
});

// Export for Vercel serverless
export default app;
