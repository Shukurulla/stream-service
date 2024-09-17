import express from "express";
import studentModel from "../models/student.model.js";
import studentScoreModel from "../models/student.score.js";
import authMiddleware from "../middleware/auth.middleware.js";
import mongoose from "mongoose";

const router = express.Router();

router.post("/add-score", authMiddleware, async (req, res) => {
  const { studentId, lesson, score } = req.body;

  try {
    // Talabani studentModel orqali topish
    const student = await studentModel.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student topilmadi" });
    }

    // Talabaning shu dars uchun qo'yilgan ballini tekshirish
    const existingScore = await studentScoreModel.findOne({
      studentId: studentId,
      lesson: lesson,
    });

    if (existingScore) {
      // Agar ball mavjud bo'lsa, yangilash
      existingScore.score = score;
      existingScore.student = {
        profileImage: student.profileImage,
        name: student.name,
        group: student.group,
      };
      await existingScore.save();
      return res
        .status(200)
        .json({ message: "Ball yangilandi", score: existingScore });
    } else {
      // Agar ball yo'q bo'lsa, yangi ball qo'shish
      const newScore = new studentScoreModel({
        student: {
          profileImage: student.profileImage,
          name: student.name,
          group: student.group,
        },
        studentId: studentId,
        lesson: lesson,
        score: score,
      });
      await newScore.save();
      return res
        .status(201)
        .json({ message: "Ball qo'shildi", score: newScore });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Xatolik yuz berdi" });
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
    const studentScores = scores.filter((c) => c.student.id == id);
    res.status(200).json(studentScores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/score/lesson/:lesson", async (req, res) => {
  const { lesson } = req.params;
  try {
    const scores = await studentScoreModel.find();
    const filterByLesson = scores.filter((c) => c.lesson == lesson);
    res.json(filterByLesson);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
