import { Router, Request, Response, RequestHandler } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

// GET /api/leaves - Get leave requests
const getLeaves: RequestHandler = async (req, res, next) => {
  try {
    const { userId } = req.query;

    let requests;
    if (userId) {
      requests = await prisma.leaveRequest.findMany({
        where: { userId: String(userId) },
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, employeeId: true, role: true } } }
      });
    } else {
      requests = await prisma.leaveRequest.findMany({
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, employeeId: true, role: true } } }
      });
    }

    res.json(requests);
  } catch (error) {
    next(error);
  }
};

// POST /api/leaves - Apply for leave
const applyLeave: RequestHandler = async (req, res, next) => {
  try {
    const { userId, leaveType, startDate, endDate, remarks } = req.body;

    if (!userId || !leaveType || !startDate || !endDate) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const request = await prisma.leaveRequest.create({
      data: {
        userId,
        leaveType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        remarks,
        status: "PENDING"
      }
    });

    res.status(201).json(request);
  } catch (error) {
    next(error);
  }
};

// PUT /api/leaves/:id/approve - Approve leave (HR)
const approveLeave: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    const request = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        comment
      }
    });

    res.json(request);
  } catch (error) {
    next(error);
  }
};

// PUT /api/leaves/:id/reject - Reject leave (HR)
const rejectLeave: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    const request = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        comment
      }
    });

    res.json(request);
  } catch (error) {
    next(error);
  }
};

router.get("/", getLeaves);
router.post("/", applyLeave);
router.put("/:id/approve", approveLeave);
router.put("/:id/reject", rejectLeave);

export default router;
