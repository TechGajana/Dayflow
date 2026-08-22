import { Router, Request, Response, RequestHandler } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

// GET /api/attendance - List attendance logs
const getAttendance: RequestHandler = async (req, res, next) => {
  try {
    const { userId } = req.query;

    let logs;
    if (userId) {
      logs = await prisma.attendance.findMany({
        where: { userId: String(userId) },
        orderBy: { date: "desc" },
        include: { user: { select: { name: true, employeeId: true } } }
      });
    } else {
      logs = await prisma.attendance.findMany({
        orderBy: { date: "desc" },
        include: { user: { select: { name: true, employeeId: true } } }
      });
    }

    res.json(logs);
  } catch (error) {
    next(error);
  }
};

// GET /api/attendance/today - Get active checkin for user
const getTodayStatus: RequestHandler = async (req, res, next) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const log = await prisma.attendance.findFirst({
      where: {
        userId: String(userId),
        date: {
          gte: todayStart
        }
      }
    });

    res.json(log);
  } catch (error) {
    next(error);
  }
};

// POST /api/attendance/checkin - Check-In
const checkIn: RequestHandler = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Check if checkin already exists for today
    const existing = await prisma.attendance.findFirst({
      where: {
        userId,
        date: { gte: todayStart }
      }
    });

    if (existing) {
      res.status(400).json({ error: "Already checked in today" });
      return;
    }

    const log = await prisma.attendance.create({
      data: {
        userId,
        date: todayStart,
        checkIn: new Date(),
        status: "PRESENT"
      }
    });

    res.status(201).json(log);
  } catch (error) {
    next(error);
  }
};

// POST /api/attendance/checkout - Check-Out
const checkOut: RequestHandler = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const log = await prisma.attendance.findFirst({
      where: {
        userId,
        date: { gte: todayStart },
        checkOut: null
      }
    });

    if (!log) {
      res.status(400).json({ error: "No active check-in found for today" });
      return;
    }

    const updated = await prisma.attendance.update({
      where: { id: log.id },
      data: {
        checkOut: new Date()
      }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

router.get("/", getAttendance);
router.get("/today", getTodayStatus);
router.post("/checkin", checkIn);
router.post("/checkout", checkOut);

export default router;
