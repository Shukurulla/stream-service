import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import FileModel from "../models/file.model.js";
import groupModel from "../models/group.model.js";
import teacherModel from "../models/teacher.model.js";
import cors from "cors";
import path from "path";
import { v2 as cloudinary } from "cloudinary";

const router = express.Router();

router.get("/file/all", async (req, res) => {
  try {
    const files = await FileModel.find();
    res.json(files);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message, error });
  }
});

router.get("/groups/all", async (req, res) => {
  try {
    const teachers = await teacherModel.find();
    const uniqueArray = [...new Set(teachers.map((item) => item.science))];
    const files = await FileModel.find();
    res.json(
      uniqueArray.map((item) => {
        const findFiles = files.filter((c) => c.from.science == item);
        return { science: item, totalFiles: findFiles.length };
      })
    );
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

router.post("/file/by-science", async (req, res) => {
  try {
    const { science } = req.body;
    const findFiles = await FileModel.find({ "from.science": science });
    res.json(findFiles);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

router.get("/file/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const file = await FileModel.findById(id);
    if (!file) {
      return res.status(400).json({ message: "Bunday file topilmadi" });
    }
    res.json(file);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message, error });
  }
});
router.get("/file/my-files/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const findTeacher = await teacherModel.findById(id);
    if (!findTeacher) {
      return res.status(400).json({ message: "Bunday teacher topilmadi" });
    }
    const files = await FileModel.find({ "from.id": id });
    res.json(files);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message, error });
  }
});
router.get("/file/group/:number", async (req, res) => {
  try {
    const { number } = req.params;
    const findGroup = await groupModel.findOne({ name: number });
    if (!findGroup) {
      return res.status(400).json({ message: "Bunday group topilmadi" });
    }
    const files = await FileModel.find({ "group.name": number });
    res.json(files);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message, error });
  }
});

router.delete("/file/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const findFile = await FileModel.findById(id);
    if (!findFile) {
      return res.status(400).json({ message: "Bunday file topilmadi" });
    }
    await FileModel.findByIdAndDelete(id);
    res.json({ message: "File muaffaqqiyatli ochirildi" });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message, error });
  }
});

export default router;
