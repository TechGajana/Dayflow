import { Router, Request, Response, RequestHandler } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";

const router = Router();

// POST /api/auth/register
const registerUser: RequestHandler = async (req, res, next) => {
  try {
    const { employeeId, name, email, password, role } = req.body;

    if (!employeeId || !name || !email || !password) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    // Check if email or employeeId already exists
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      res.status(400).json({ error: "Email is already registered" });
      return;
    }

    const existingEmpId = await prisma.user.findUnique({ where: { employeeId } });
    if (existingEmpId) {
      res.status(400).json({ error: "Employee ID is already registered" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        employeeId,
        name,
        email,
        password: hashedPassword,
        role: role || "EMPLOYEE",
        basicSalary: role === "HR" ? 6500.0 : 5000.0, // default placeholder salaries
        allowance: 400.0,
        deductions: 150.0
      }
    });

    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login
const loginUser: RequestHandler = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
};

router.post("/register", registerUser);
router.post("/login", loginUser);

export default router;
