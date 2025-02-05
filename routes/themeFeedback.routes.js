import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import studentModel from "../models/student.model.js";
import teacherModel from "../models/teacher.model.js";
import ThemeFeedbackModel from "../models/theme-feedback.model.js";
import ThemeModel from "../models/theme.model.js";
import Stream from "../models/stream.model.js";
import { all } from "axios";

const router = express.Router();

router.get("/feedbacks/:id", async (req, res) => {
  try {
    const findTeacher = await teacherModel.findById(req.params.id);
    if (!findTeacher) {
      return res.status(400).json({ message: "Bunday teacher topilmadi" });
    }

    const streams = await Stream.find();
    const findStream = streams
      .flatMap((stream) =>
        stream.rating.ratings.filter(
          (rating) => rating.teacher.id === req.params.id
        )
      )
      .map((item) => {
        return { item, isStream: true, createdAt: item.createdAt };
      });

    const themes = await ThemeModel.find();
    const findThemes = themes
      .filter((c) => c.teacher.id == req.params.id)
      .map((item) => {
        return { isStream: false, item, createdAt: item.createdAt };
      });

    const combined = findStream.concat(findThemes);

    // To'g'ri `sort` metodi
    combined.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json(combined);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message, error });
  }
});

router.get("/theme-feedback/all", async (req, res) => {
  try {
    const feedbacks = await ThemeFeedbackModel.find();
    res.json(
      [...feedbacks].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      )
    );
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message, error });
  }
});
router.get("/theme-feedback/by-theme/:id", async (req, res) => {
  try {
    const findTheme = await ThemeModel.findById(req.params.id);
    if (!findTheme) {
      return res.status(400).json({ message: "Bunday theme topilmadi" });
    }
    const feedbacks = await ThemeFeedbackModel.find();
    const filteredFeedback = feedbacks.filter(
      (c) => c.theme._id == req.params.id
    );
    res.json(
      [...filteredFeedback].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      )
    );
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message, error });
  }
});

router.post("/theme-feedback/create", authMiddleware, async (req, res) => {
  try {
    const { teacher, themeId, student } = req.body;
    const findTeacher = await teacherModel.findById(teacher);
    if (!findTeacher) {
      return res.status(400).json({ message: "Bunday teacher topilmadi" });
    }
    const findStudent = await studentModel.findById(student);
    if (!findStudent) {
      return res.status(400).json({ message: "Bunday Student topilmadi" });
    }
    const findTheme = await ThemeModel.findById(themeId);
    if (!findTheme) {
      return res.status(400).json({ message: "Bunday theme topilmadi" });
    }

    const teacherSchema = {
      name: findTeacher.name,
      science: findTeacher.science,
      profileImage: findTeacher.profileImage,
      id: findTeacher._id,
    };
    const studentSchema = {
      name: findStudent.name,
      group: findStudent.group,
      profileImage: findStudent.profileImage,
      id: findStudent._id,
    };

    const feedback = await ThemeFeedbackModel.create({
      ...req.body,
      teacher: teacherSchema,
      student: studentSchema,
      theme: findTheme,
    });
    if (!feedback) {
      return res.status(500).json({ message: "Feedback qoshilmadi" });
    }
    res.json(feedback);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message, error });
  }
});

router.put("/theme-feedback/edit/:id", authMiddleware, async (req, res) => {
  try {
    const findFeedback = await ThemeFeedbackModel.findById(req.params.id);

    if (!findFeedback) {
      return res.status(400).json({ message: "Bunday feedback topilmadi" });
    }
    const feedback = await ThemeFeedbackModel.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    res.json(feedback);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message, error });
  }
});
router.delete(
  "/theme-feedback/delete/:id",
  authMiddleware,
  async (req, res) => {
    try {
      const findFeedback = await ThemeFeedbackModel.findById(req.params.id);

      if (!findFeedback) {
        return res.status(400).json({ message: "Bunday feedback topilmadi" });
      }
      await ThemeFeedbackModel.findByIdAndDelete(req.params.id);
      res.json({ message: "Feedback muaffaqiyatli ochirildi" });
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message, error });
    }
  }
);

router.delete("/theme-feedback/all-delete", async (req, res) => {
  try {
    const allFeedbacks = await ThemeFeedbackModel.find();
    for (let i = 0; i < allFeedbacks.length; i++) {
      await ThemeFeedbackModel.findByIdAndDelete(allFeedbacks[i]._id);
    }
    res.json(allFeedbacks);
  } catch (error) {
    res.json(error);
  }
});

export default router;
