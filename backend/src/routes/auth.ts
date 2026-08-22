import { Router, Request, Response, RequestHandler } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { generateEmployeeId } from "../lib/idGenerator.js";

const router = Router();

// POST /api/auth/register - Sign Up (Registers HR Manager & Company)
const registerUser: RequestHandler = async (req, res, next) => {
  try {
    const { companyName, name, email, mobile, password } = req.body;

    if (!companyName || !name || !email || !password) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      res.status(400).json({ error: "Email is already registered" });
      return;
    }

    const joinDate = new Date();
    // Auto-generate employee ID for the registering HR Manager
    const employeeId = await generateEmployeeId(companyName, name, joinDate);
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        employeeId,
        name,
        email,
        password: hashedPassword,
        role: "HR",
        mobile: mobile || null,
        company: companyName,
        joinDate,
        monthWage: 6500.0, // Default HR Manager Salary
        workingDaysPerWeek: 5,
        breakTime: 1.0,
        hrsPerDay: 8.0,
        about: `HR Manager at ${companyName}.`,
        jobLove: "I love streamlining HR and building a strong employee workflow.",
        hobbies: "Corporate planning, reading.",
      }
    });

    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login - Sign In (accepts Email or Login ID)
const loginUser: RequestHandler = async (req, res, next) => {
  try {
    const { email: loginIdentifier, password } = req.body;

    if (!loginIdentifier || !password) {
      res.status(400).json({ error: "Login ID/Email and password are required" });
      return;
    }

    // Find user by either email OR employeeId (Login ID)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: loginIdentifier },
          { employeeId: loginIdentifier }
        ]
      }
    });

    if (!user) {
      res.status(401).json({ error: "Invalid Login ID/Email or password" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ error: "Invalid Login ID/Email or password" });
      return;
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
};

// PUT /api/auth/password - Update password (used by Security tab)
const changePassword: RequestHandler = async (req, res, next) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;

    if (!userId || !oldPassword || !newPassword) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      res.status(400).json({ error: "Current password does not match" });
      return;
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed }
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

router.post("/register", registerUser);
router.post("/login", loginUser);
router.put("/password", changePassword);

export default router;
