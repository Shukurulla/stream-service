import express from "express";
import studentModel from "../models/student.model.js";
import studentScoreModel from "../models/student.score.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/create-score", authMiddleware, async (req, res) => {
  try {
    const { student } = req.body;
    const findStudent = await studentModel.findById(student.id);
    if (!findStudent) {
      return res.status(404).json({ error: "Bunday student topilmadi" });
    }

    const score = await studentScoreModel.findOne({ lesson: req.body.lesson });
    if (score) {
      res.json({ message: "Bu student reytingi oldin qayd etilgan" });
    } else {
      const rating = await studentScoreModel.create(req.body);
      res.status(200).json(rating);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/all-score", async (req, res) => {
  try {
    const scores = await studentScoreModel.find();
    res.status(200).json(scores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/score/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const student = await studentModel.findById(id);
    if (!student) {
      return res.status(404).json({ error: "Bunday student topilmadi" });
    }
    const scores = await studentScoreModel.find();
  } catch (error) {}
});

export default router;
