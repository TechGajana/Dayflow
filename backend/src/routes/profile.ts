import { Router, Request, Response, RequestHandler } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { generateEmployeeId } from "../lib/idGenerator.js";

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

// POST /api/profile/employee - Create new employee user (HR/Admin only)
const createEmployee: RequestHandler = async (req, res, next) => {
  try {
    const { hrUserId, name, email, mobile, department, title, basicSalary, allowance, deductions } = req.body;

    if (!hrUserId || !name || !email) {
      res.status(400).json({ error: "HR User ID, Employee Name, and Email are required" });
      return;
    }

    // Find HR user to get the company name
    const hrUser = await prisma.user.findUnique({
      where: { id: hrUserId }
    });

    if (!hrUser || hrUser.role !== "HR") {
      res.status(403).json({ error: "Unauthorized. Only HR Managers can create employees." });
      return;
    }

    const companyName = hrUser.company || "Dayflow Technologies";
    const joinDate = new Date();

    // Check if email already registered
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ error: "Email is already registered" });
      return;
    }

    // Auto-generate employee ID
    const employeeId = await generateEmployeeId(companyName, name, joinDate);

    // Auto-generate temporary password (e.g. DF + 4 random digits)
    const randomDigits = Math.floor(1000 + Math.random() * 9000).toString();
    const temporaryPassword = `DF${randomDigits}`;
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const newEmployee = await prisma.user.create({
      data: {
        employeeId,
        name,
        email,
        password: hashedPassword,
        role: "EMPLOYEE",
        mobile: mobile || null,
        company: companyName,
        department: department || null,
        title: title || null,
        joinDate,
        monthWage: basicSalary !== undefined ? parseFloat(basicSalary) : 5000.0,
        workingDaysPerWeek: 5,
        breakTime: 1.0,
        hrsPerDay: 8.0,
        about: "New employee profile.",
        jobLove: "I love contributing my skills to the product engineering lifecycle.",
        hobbies: "Exploring tech, gaming.",
      }
    });

    res.status(201).json({
      employee: newEmployee,
      temporaryPassword // Return plain password for HR manager to copy/share
    });
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
      dob,
      address,
      nationality,
      personalEmail,
      gender,
      maritalStatus,
      accountNumber,
      bankName,
      ifscCode,
      panNo,
      uanNo,
      empCode,
      monthWage,
      workingDaysPerWeek,
      breakTime,
      hrsPerDay,
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
        dob: dob ? new Date(dob) : undefined,
        address,
        nationality,
        personalEmail,
        gender,
        maritalStatus,
        accountNumber,
        bankName,
        ifscCode,
        panNo,
        uanNo,
        empCode,
        monthWage: monthWage !== undefined ? parseFloat(monthWage) : undefined,
        workingDaysPerWeek: workingDaysPerWeek !== undefined ? parseInt(workingDaysPerWeek) : undefined,
        breakTime: breakTime !== undefined ? parseFloat(breakTime) : undefined,
        hrsPerDay: hrsPerDay !== undefined ? parseFloat(hrsPerDay) : undefined,
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
router.post("/employee", createEmployee);
router.put("/", updateProfile);
router.put("/about", updateAbout);

export default router;
