import express from "express";
import teacherModel from "../models/teacher.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const router = express.Router();

/**
 * @swagger
 * /create-teacher:
 *   post:
 *     summary: "O'qituvchi yaratish"
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

export default router;
