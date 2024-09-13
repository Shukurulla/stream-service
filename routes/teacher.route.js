import express from "express";
import teacherModel from "../models/teacher.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { verifyToken } from "../middleware/verifyToken.middleware.js";

const router = express.Router();

/**
 * @swagger
 * /create-teacher:
 *   post:
 *     summary: "O'qituvchi yaratish"
 *     tags: [Teacher]
 *     description: "Yangi o'qituvchini yaratish va JWT token olish"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: "O'qituvchining ismi"
 *               password:
 *                 type: string
 *                 description: "O'qituvchining paroli"
 *               science:
 *                 type: string
 *                 description: "O'qituvchining fani"
 *               profileImage:
 *                 type: string
 *                 description: "O'qituvchining profil rasmi URL"
 *     responses:
 *       200:
 *         description: "O'qituvchi muvaffaqiyatli yaratildi va JWT token yaratildi"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 teacher:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     role:
 *                       type: string
 *                     profileImage:
 *                       type: string
 *       400:
 *         description: "Yaratuvchida xatolik"
 */
router.post("/create-teacher", async (req, res) => {
  try {
    const { password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const teacher = await teacherModel.create({
      ...req.body,
      originalPassword: password,
      password: hashedPassword,
    });
    if (teacher) {
      const token = jwt.sign({ userId: teacher._id }, process.env.JWT_SECRET, {
        expiresIn: "30d",
      });

      res.json({ token, teacher });
    } else {
      res.status(400).json({ error: "Teacher yaratilmadi" });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /login-teacher:
 *   post:
 *     summary: "O'qituvchi tizimga kirishi"
 *     tags: [Teacher]
 *     description: "O'qituvchi tizimga kirishi va JWT token olish"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: "O'qituvchining ismi"
 *               password:
 *                 type: string
 *                 description: "O'qituvchining paroli"
 *     responses:
 *       200:
 *         description: "O'qituvchi muvaffaqiyatli tizimga kirdi va JWT token yaratildi"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     role:
 *                       type: string
 *                     profileImage:
 *                       type: string
 *       401:
 *         description: "Noto'g'ri foydalanuvchi nomi yoki parol"
 *       400:
 *         description: "Server xatosi"
 */
router.post("/login-teacher", async (req, res) => {
  try {
    const { name, password } = req.body;
    const user = await teacherModel.findOne({ name });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res
        .status(401)
        .json({ message: "Noto'g'ri foydalanuvchi nomi yoki parol" });
    }
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );
    res.json({ token, user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
/**
 * @swagger
 * /teacher/me:
 *   get:
 *     summary: "O'qituvchi ma'lumotlarini token orqali olish"
 *     tags: [Teacher]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: O'qituvchi ma'lumotlari
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   description: O'qituvchi IDsi
 *                 name:
 *                   type: string
 *                   description: O'qituvchi ismi
 *                 email:
 *                   type: string
 *                   description: O'qituvchi emaili
 *       403:
 *         description: Token kerak
 *       401:
 *         description: Token noto'g'ri yoki muddati tugagan
 */
router.get("/teacher/me", verifyToken, async (req, res) => {
  try {
    const teacher = await teacherModel.findById(req.user.userId);

    if (!teacher) {
      return res.status(404).json({ message: "O'qituvchi topilmadi" });
    }
    res.json(teacher);
  } catch (error) {
    res.status(500).json({ message: "Server xatosi" });
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
router.put("/teacher/profile", verifyToken, async (req, res) => {
  try {
    const student = await studentModel.findById(req.user.id);

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
    res.status(200).json({ message: "Student profile updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
