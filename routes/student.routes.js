import express from "express";
import studentModel from "../models/student.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { verifyToken } from "../middleware/verifyToken.middleware.js";
import percentModel from "../models/studentPersent.model.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * /student/register:
 *   post:
 *     summary: "Talabani ro'yxatdan o'tkazish"
 *     tags: [Student]
 *     description: "Yangi talabani ro'yxatdan o'tkazish va JWT token olish"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: "Talabaning ismi"
 *               password:
 *                 type: string
 *                 description: "Talabaning paroli"
 *               group:
 *                 type: string
 *                 description: "Talabaning guruhi"
 *               kurs:
 *                 type: string
 *                 description: "Talabaning kursi"
 *               profileImage:
 *                 type: string
 *                 description: "Talabaning profil rasmi URL"
 *     responses:
 *       201:
 *         description: "Talaba muvaffaqiyatli ro'yxatdan o'tkazildi va JWT token yaratildi"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 student:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     group:
 *                       type: string
 *                     kurs:
 *                       type: string
 *                     profileImage:
 *                       type: string
 *       500:
 *         description: "Server xatosi"
 */
const sciences = ["Listening", "Reading", "Writing", "Speaking"];

router.post("/student/register", async (req, res) => {
  const { name, password, phone, group, profileImage } = req.body;

  const findPhone = await studentModel.findOne({ phone });

  if (findPhone) {
    return res
      .status(400)
      .json({ message: "Bu telefon raqam oldin royhatdan otgan" });
  }

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new student
    const newStudent = new studentModel({
      name,
      password: hashedPassword,
      originalPassword: password,
      group,
      phone,
      profileImage,
    });

    // Save student to database
    await newStudent.save();
    const token = jwt.sign({ userId: newStudent._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });
    for (let i = 0; i < sciences.length; i++) {
      await percentModel.create({
        percent: 0,
        science: sciences[i],
        student: newStudent._id,
      });
    }
    res.status(201).json({
      message: "User registered successfully",
      token,
      student: newStudent,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

/**
 * @swagger
 * /student/login:
 *   post:
 *     summary: "Talaba tizimga kirishi"
 *     tags: [Student]
 *     description: "Talaba tizimga kirishi va JWT token olish"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: "Talabaning ismi"
 *               password:
 *                 type: string
 *                 description: "Talabaning paroli"
 *     responses:
 *       200:
 *         description: "Talaba muvaffaqiyatli tizimga kirishi va JWT token yaratildi"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 student:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     group:
 *                       type: string
 *                     kurs:
 *                       type: string
 *                     profileImage:
 *                       type: string
 *       400:
 *         description: "Noto'g'ri ma'lumotlar"
 *       500:
 *         description: "Server xatosi"
 */
router.post("/student/login", async (req, res, next) => {
  const { phone, password } = req.body;

  try {
    // Find user by name
    const student = await studentModel.findOne({ phone });
    if (!student) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: student._id, name: student.name },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.status(200).json({ token, student });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
    next();
  }
});

/**
 * @swagger
 * /api/student/me:
 *   get:
 *     summary: Talaba ma'lumotlarini token orqali olish
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Talaba ma'lumotlari
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   description: Talaba IDsi
 *                 name:
 *                   type: string
 *                   description: Talaba ismi
 *                 email:
 *                   type: string
 *                   description: Talaba emaili
 *       403:
 *         description: Token kerak
 *       401:
 *         description: Token noto'g'ri yoki muddati tugagan
 */
router.get("/student/me", authMiddleware, async (req, res) => {
  try {
    const student = await studentModel.findById(req.userData.userId); // JWT orqali id olinadi
    if (!student) {
      return res.status(404).json({ message: "Talaba topilmadi" });
    }
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: "Server xatosi" });
  }
});

router.get("/all-students", async (req, res) => {
  try {
    const students = await studentModel.find();
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /student/profile:
 *   put:
 *     summary: Update student profile with jwt token
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               password:
 *                 type: string
 *               kurs:
 *                 type: string
 *               profileImage:
 *                 type: string
 *     responses:
 *       200:
 *         description: Student profile updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.put("/student/profile", verifyToken, async (req, res) => {
  try {
    const student = await studentModel.findById(req.user.userId);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (req.body.password) {
      student.password = await bcrypt.hash(req.body.password, 10);
      student.originalPassword = req.body.password;
    }

    student.name = req.body.name || student.name;
    student.kurs = req.body.kurs || student.kurs;
    student.profileImage = req.body.profileImage || student.profileImage;

    await student.save();
    res
      .status(200)
      .json({ message: "Student profile updated successfully", student });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /student/profile:
 *   delete:
 *     summary: Delete student profile
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student profile deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Student not found
 *       500:
 *         description: Server error
 */
router.delete("/student/profile", verifyToken, async (req, res) => {
  try {
    const student = await studentModel.findByIdAndDelete(req.user.userId);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(200).json({ message: "Student profile deleted successfully" });
  } catch (error) {
    console.error("Error deleting student profile:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
