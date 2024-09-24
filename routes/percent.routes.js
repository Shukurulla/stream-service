import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import percentModel from "../models/studentPersent.model.js";
import studentModel from "../models/student.model.js";

const router = Router();

router.post("/add-percent", authMiddleware, async (req, res) => {
  try {
    const percents = await percentModel.create(req.body);

    res.status(200).json(percents);
  } catch (error) {
    res.json({ message: error.message });
  }
});

router.get("/all-percents", async (req, res) => {
  try {
    const percents = await percentModel.find();
    res.status().json(percents);
  } catch (error) {
    res.json({ message: error.message });
  }
});

router.get("/percent/:sciense", async (req, res) => {
  try {
    const findPercent = await percentModel.find({
      science: req.params.sciense,
    });

    res.status(200).json(findPercent);
  } catch (error) {
    res.json({ message: error.message });
  }
});

router.get("/percent/student/:studentId", async (req, res) => {
  try {
    const findPercent = await percentModel.find({
      student: req.params.studentId,
    });
    res.status(200).json(findPercent);
  } catch (error) {
    res.json({ message: error.message });
  }
});

router.put("/percent/edit", authMiddleware, async (req, res) => {
  try {
    const { percent, student, science } = req.body;
    const findStudent = await studentModel.findById(student);
    if (!findStudent) {
      return res.status(400).json({ message: "Bunday student topilmadi" });
    }

    const findPercentScience = await percentModel.findOne({ student, science });

    if (!findPercentScience) {
      return res.json({ message: "bunday percent topilmadi" });
    }

    await percentModel.findByIdAndUpdate(findPercentScience._id, { percent });
    const updatePercent = await percentModel.findById(findPercentScience._id);
    res.status(200).json(updatePercent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/percent/:id/delete", authMiddleware, async (req, res) => {
  try {
    const findPercent = await percentModel.findById(req.params.id);
    if (!findPercent) {
      return res.status(400).json({ error: "Bunday percent topilmadi" });
    }
    await percentModel.findByIdAndDelete(req.params.id);
    res.json({ message: "Percent muaffaqiyatli ochirildi" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
