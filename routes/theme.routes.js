import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import ThemeModel from "../models/theme.model.js";
import ThemeFeedbackModel from "../models/theme-feedback.model.js";
import teacherModel from "../models/teacher.model.js";

const router = express.Router();

router.get("/theme/all", async (req, res) => {
  try {
    const themes = await ThemeModel.find();
    res.json(themes);
  } catch (error) {
    res.status(error.status || 500).json({ error, message: error.message });
  }
});
router.get("/theme/my-theme", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.userData;
    const themes = await ThemeModel.find();
    const myThemes = themes.filter((c) => c.teacher.id == userId);
    res.json(myThemes);
  } catch (error) {
    res.status(error.status || 500).json({ error, message: error.message });
  }
});

router.post("/theme/create", authMiddleware, async (req, res) => {
  try {
    const { teacher } = req.body;
    const findTeacher = await teacherModel.findById(teacher);
    if (!findTeacher) {
      return res.status(400).json({ message: "Bunday teacher topilmadi" });
    }
    const theme = await ThemeModel.create({
      ...req.body,
      teacher: {
        science: findTeacher.science,
        name: findTeacher.name,
        profileImage: findTeacher.profileImage,
        id: findTeacher._id,
      },
    });
    res.json(theme);
  } catch (error) {
    res.status(error.status || 500).json({ error, message: error.message });
  }
});
router.put("/theme/edit/:id", authMiddleware, async (req, res) => {
  try {
    const findTheme = await ThemeModel.findById(req.params.id);
    if (!findTheme) {
      return res.status(400).json({ message: "Bunday theme topilmadi" });
    }
    const theme = await ThemeModel.findByIdAndUpdate(
      req.params.id,
      {
        $set: req.body,
      },
      { new: true }
    );
    res.json(theme);
  } catch (error) {
    res.status(error.status || 500).json({ error, message: error.message });
  }
});
router.delete("/theme/delete/:id", authMiddleware, async (req, res) => {
  try {
    const findTheme = await ThemeModel.findById(req.params.id);
    if (!findTheme) {
      return res.status(400).json({ message: "Bunday theme topilmadi" });
    }
    await ThemeModel.findByIdAndDelete(req.params.id);
    res.json({ message: "Theme muaffaqiyatli ochirildi" });
  } catch (error) {
    res.status(error.status || 500).json({ error, message: error.message });
  }
});
export default router;
