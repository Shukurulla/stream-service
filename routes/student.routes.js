import express from "express";
import studentModel from "../models/student.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router = express.Router();

router.post("/student/register", async (req, res) => {
  const { name, password, group, kurs, profileImage } = req.body;

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new student
    const newStudent = new studentModel({
      name,
      password: hashedPassword,
      originalPassword: password,
      group,
      kurs,
      profileImage,
    });

    // Save student to database
    await newStudent.save();
    const token = jwt.sign({ userId: newStudent._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    res.status(201).json({
      message: "User registered successfully",
      token,
      student: newStudent,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});
router.post("/student/login", async (req, res) => {
  const { name, password } = req.body;

  try {
    // Find user by name
    const student = await studentModel.findOne({ name });
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
  }
});
export default router;
