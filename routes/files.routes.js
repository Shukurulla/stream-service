import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import FileModel from "../models/file.model.js";
import groupModel from "../models/group.model.js";
import teacherModel from "../models/teacher.model.js";

const router = express.Router();

router.get("/files/all", async (req, res) => {
  try {
    const files = await FileModel.find();
    res.json(files);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message, error });
  }
});
router.get("/files/:id", async (req, res) => {
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
router.post("/files/create", async (req, res) => {
  try {
    const { title, description, group, teacherId } = req.body;
    const findTeacher = await teacherModel.findById(teacherId);
    if (!findTeacher) {
      return res.status(400).send("Bunday teacher topilmadi");
    }

    const findGroup = await groupModel.findOne({ name: group });

    if (!findGroup) {
      return res.status(400).send("Bunday guruh topilmadi");
    }

    if (!req.files || !req.files.file) {
      return res.status(400).send("File yuborish majburiy");
    }

    const file = req.files.file;

    // Faylni Cloudinary'ga yuklash
    const uploadResult = await cloudinary.uploader.upload(file.tempFilePath, {
      folder: "users/files", // Cloudinary'dagi papka
      resource_type: "auto", // Har qanday fayl turini yuklash uchun
    });

    // MongoDB yoki boshqa ma'lumotlar bazasida saqlash uchun URL
    const fileData = {
      title,
      description,
      group: {
        name: findGroup.name,
        id: findGroup._id,
      },
      from: {
        id: findTeacher._id,
        name: findTeacher.name,
        science: findTeacher.science,
        profileImage: findTeacher.profileImage,
      },
      fileUrl: uploadResult.secure_url, // Cloudinary qaytargan to‘liq URL
    };
    const dbFile = await FileModel.create(fileData);
    // Bu yerda fileData ni ma'lumotlar bazasiga saqlashni amalga oshiring
    res.status(201).json(dbFile);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

export default router;
