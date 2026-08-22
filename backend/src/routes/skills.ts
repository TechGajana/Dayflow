import { Router, Request, Response, RequestHandler } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

// POST /api/skills - Add a new skill
const addSkill: RequestHandler = async (req, res, next) => {
  try {
    const { userId, name, level } = req.body;
    if (!userId || !name) {
      res.status(400).json({ error: "userId and name are required" });
      return;
    }

    const skill = await prisma.skill.create({
      data: {
        name,
        level: level ?? 3,
        userId,
      },
    });
    res.status(201).json(skill);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/skills/:id - Delete a skill
const deleteSkill: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.skill.delete({
      where: { id },
    });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

router.post("/", addSkill);
router.delete("/:id", deleteSkill);

export default router;
