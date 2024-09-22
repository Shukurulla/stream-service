import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import percentModel from "../models/studentPersent.model.js";
import studentModel from "../models/student.model.js";

const router = Router();

router.post("/add-percent", authMiddleware, async (req, res) => {
  try {
    const percents = await percentModel.create(req.body);

    res.json(percents);
  } catch (error) {
    res.json({ error: error.message });
  }
});

router.get("/all-percents", async (req, res) => {
  try {
    const percents = await percentModel.find();
    res.json(percents);
  } catch (error) {
    res.json({ error: error.message });
  }
});

router.get("/percent/:sciense", async (req, res) => {
  try {
    const findPercent = await percentModel.find({
      science: req.params.sciense,
    });

    res.json(findPercent);
  } catch (error) {
    res.json({ error: error.message });
  }
});

router.get("/percent/student/:studentId", async (req, res) => {
  try {
    const findPercent = await percentModel.find({
      student: req.params.studentId,
    });
    res.json(findPercent);
  } catch (error) {
    res.json({ error: error.message });
  }
});

router.put("/percent/edit", authMiddleware, async (req, res) => {
  try {
    const { percent, student, science } = req.body;
    const findStudent = await studentModel.findById(student);
    if (!findStudent) {
      return res.json({ error: "Bunday student topilmadi" });
    }

    const findPercentScience = await percentModel.find({ student, science });
    if (findPercentScience) {
      return res.json({ error: "bunday percent topilmadi" });
    }

    res.json(updatePercent);
  } catch (error) {
    res.json({ error: error.message });
  }
});

router.delete("/percent/:id/delete", authMiddleware, async (req, res) => {
  try {
    const findPercent = await percentModel.findById(req.params.id);
    if (!findPercent) {
      return res.json({ error: "Bunday percent topilmadi" });
    }
    await percentModel.findByIdAndDelete(req.params.id);
    res.json({ message: "Percent muaffaqiyatli ochirildi" });
  } catch (error) {
    res.json({ error: error.message });
  }
});

export default router;
