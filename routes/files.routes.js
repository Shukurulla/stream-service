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
router.get("/file/:id", async (req, res) => {
  try {
    const { id } = req.params.id;
    const file = await FileModel.findById(id);
    if (!file) {
      return res.status(400).json({ message: "Bunday file topilmadi" });
    }
    res.json(file);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message, error });
  }
});

export default router;
