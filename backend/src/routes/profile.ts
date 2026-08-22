import { Router, Request, Response, RequestHandler } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

// GET /api/profile - Fetch profile of first user (single-user app) or specified user by id query
const getProfile: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.query;

    if (id) {
      const user = await prisma.user.findUnique({
        where: { id: String(id) },
        include: {
          skills: { orderBy: { level: "desc" } },
          certifications: { orderBy: { issueDate: "desc" } },
        },
      });
      res.json(user);
      return;
    }

    // Default to the first user
    const user = await prisma.user.findFirst({
      include: {
        skills: { orderBy: { level: "desc" } },
        certifications: { orderBy: { issueDate: "desc" } },
      },
    });
    res.json(user);
  } catch (error) {
    next(error);
  }
};

// GET /api/profile/all - Fetch list of all employees (HR dashboard dropdown)
const getAllProfiles: RequestHandler = async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        role: true,
        department: true,
        title: true
      }
    });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

// PUT /api/profile - Update profile fields (supports both regular and HR updates)
const updateProfile: RequestHandler = async (req, res, next) => {
  try {
    const {
      userId,
      name,
      email,
      mobile,
      company,
      department,
      manager,
      location,
      title,
      address,
      basicSalary,
      allowance,
      deductions,
    } = req.body;

    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        mobile,
        company,
        department,
        manager,
        location,
        title,
        address,
        basicSalary: basicSalary !== undefined ? parseFloat(basicSalary) : undefined,
        allowance: allowance !== undefined ? parseFloat(allowance) : undefined,
        deductions: deductions !== undefined ? parseFloat(deductions) : undefined,
      },
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// PUT /api/profile/about - Update text blocks
const updateAbout: RequestHandler = async (req, res, next) => {
  try {
    const { userId, about, jobLove, hobbies } = req.body;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { about, jobLove, hobbies },
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

router.get("/", getProfile);
router.get("/all", getAllProfiles);
router.put("/", updateProfile);
router.put("/about", updateAbout);

export default router;
