import express from "express";
import teacherModel from "../models/teacher.model";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const router = express.Router();

router.post("/create-teacher", async (req, res) => {
  try {
    const { password } = req.body;
    const hashedPassword = bcrypt.hash(password, 10);

    const teacher = await teacherModel.create({
      ...req.body,
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

router.post("/login-teacher", async (req, res) => {
  try {
    const { name, password } = req.body;
    const user = await teacherModel.findOne({ name });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res
        .status(401)
        .json({ message: "Notogri foydalanuvchi nomi yoki parol" });
    }
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      config.jwtSecret,
      { expiresIn: "30d" }
    );
    res.json({ token, user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
