import { Router, Request, Response, RequestHandler } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

// POST /api/certifications - Add a new certification
const addCertification: RequestHandler = async (req, res, next) => {
  try {
    const { userId, name, issuer, issueDate, expiryDate } = req.body;
    if (!userId || !name) {
      res.status(400).json({ error: "userId and name are required" });
      return;
    }

    const cert = await prisma.certification.create({
      data: {
        name,
        issuer,
        issueDate: issueDate ? new Date(issueDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        userId,
      },
    });
    res.status(201).json(cert);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/certifications/:id - Delete a certification
const deleteCertification: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.certification.delete({
      where: { id },
    });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

router.post("/", addCertification);
router.delete("/:id", deleteCertification);

export default router;
