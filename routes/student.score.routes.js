import express from "express";
import mongoose from "mongoose";
import studentScoreModel from "../models/student.score.js";
import studentModel from "../models/student.model.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

// Mavzular ro'yxati
const topics = {
  Listening: [101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112],
  Writing: [201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211],
  Speaking: [401, 402, 403, 404, 405],
  Reading: [201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212],
};

// Mavzular soni
const lessonsData = {
  listening: topics.Listening.length,
  writing: topics.Writing.length,
  speaking: topics.Speaking.length,
  reading: topics.Reading.length,
};

// Foizni hisoblash funksiyasi (natural songa o'zgartirilgan)
const calculatePercentage = (score, totalTopics) => {
  return Math.round((score / (totalTopics * 10)) * 100);
};

// Student progress hisoblash funksiyasi
const calculateStudentProgress = async (studentId) => {
  const result = await studentScoreModel.aggregate([
    { $match: { studentId: new mongoose.Types.ObjectId(studentId) } },
    {
      $group: {
        _id: "$lesson",
        topics: { $addToSet: "$topic" },
        scores: {
          $push: {
            topic: "$topic",
            score: "$score",
          },
        },
        student: { $first: "$student" },
      },
    },
    {
      $project: {
        _id: 0,
        lesson: "$_id",
        topics: 1,
        scores: 1,
        student: 1,
        totalTopics: {
          $size: {
            $filter: {
              input: { $objectToArray: topics },
              as: "lessonTopics",
              cond: { $eq: ["$$lessonTopics.k", "$_id"] },
            },
          },
        },
      },
    },
    {
      $project: {
        lesson: 1,
        topics: 1,
        scores: 1,
        student: 1,
        totalTopics: 1,
        percentage: {
          $round: [
            {
              $multiply: [
                {
                  $divide: [
                    { $size: "$topics" },
                    {
                      $arrayElemAt: [
                        {
                          $map: {
                            input: {
                              $filter: {
                                input: { $objectToArray: topics },
                                as: "lessonTopics",
                                cond: { $eq: ["$$lessonTopics.k", "$lesson"] },
                              },
                            },
                            as: "filtered",
                            in: { $size: "$$filtered.v" },
                          },
                        },
                        0,
                      ],
                    },
                  ],
                },
                100,
              ],
            },
            0,
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        student: { $first: "$student" },
        lessons: {
          $push: {
            lesson: "$lesson",
            percentage: "$percentage",
            topics: "$scores",
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        student: 1,
        lessons: 1,
      },
    },
  ]);

  // Add missing lessons with 0 percentage
  const allLessons = Object.keys(topics);
  const completedLessons = result[0]?.lessons.map((l) => l.lesson) || [];
  const missingLessons = allLessons.filter(
    (l) => !completedLessons.includes(l)
  );

  if (result.length === 0) {
    // If no results, create a default structure
    result.push({
      student: { profileImage: "", name: "", group: "" },
      lessons: [],
    });
  }

  missingLessons.forEach((lesson) => {
    result[0].lessons.push({
      lesson,
      percentage: 0,
      topics: [],
    });
  });

  return result[0];
};

// Test natijalarini yaratish yoki yangilash
router.post("/scores", authMiddleware, async (req, res) => {
  try {
    const { studentId, lesson, topic, score } = req.body;

    const existingScore = await studentScoreModel.findOne({
      studentId,
      lesson,
      topic,
    });

    const findStudent = await studentModel.findById(studentId);

    if (!findStudent) {
      return res.status(404).json({ error: "Bunday student topilmadi" });
    }

    if (existingScore) {
      existingScore.score = score;
      await existingScore.save();
    } else {
      const newScore = new studentScoreModel({
        studentId,
        lesson,
        topic,
        score,
        student: {
          profileImage: findStudent.profileImage,
          name: findStudent.name,
          group: findStudent.group,
        },
      });
      await newScore.save();
    }

    // Calculate and include student progress
    const progress = await calculateStudentProgress(studentId);

    res.status(existingScore ? 200 : 201).json({
      message: existingScore
        ? "Natija yangilandi"
        : "Natija muvaffaqiyatli qo'shildi",
      data: existingScore || newScore,
      progress,
    });
  } catch (error) {
    res.status(400).json({
      message: "Test natijasini saqlashda xatolik",
      error,
    });
  }
});
// Ma'lum bir dars bo'yicha barcha studentlarning natijalarini olish
router.get("/lessons/:lesson", async (req, res) => {
  try {
    const { lesson } = req.params;

    // Dars bo'yicha barcha studentlarning natijalarini olish
    const scores = await studentScoreModel.aggregate([
      { $match: { lesson } }, // faqat kiritilgan dars bo'yicha natijalarni tanlash
      {
        $group: {
          _id: "$studentId",
          totalScore: { $sum: "$score" },
          tests: { $push: { topic: "$topic", score: "$score" } },
        },
      },
      {
        $lookup: {
          from: "students", // Talaba ma'lumotlarini olish uchun model nomi
          localField: "_id",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: "$student" },
      {
        $project: {
          _id: 0,
          student: {
            profileImage: "$student.profileImage",
            name: "$student.name",
            group: "$student.group",
          },
          totalScore: 1,
          tests: 1,
        },
      },
      { $sort: { totalScore: -1 } }, // Natijalarni kamayish tartibida sortlash
    ]);

    if (!scores.length) {
      return res
        .status(404)
        .json({ message: "Ushbu dars bo'yicha natijalar topilmadi" });
    }

    res
      .status(200)
      .json({
        message: `${lesson} darsiga tegishli studentlar natijalari`,
        data: scores,
      });
  } catch (error) {
    res.status(400).json({ message: "Natijalarni olishda xatolik", error });
  }
});

// Barcha studentlarning natijalari bilan ma'lumotlarini olish va foizlarni qo'shish
router.get("/scores", async (req, res) => {
  try {
    const scores = await studentScoreModel.aggregate([
      {
        $group: {
          _id: {
            studentId: "$studentId",
            lesson: "$lesson",
          },
          student: { $first: "$student" },
          totalScore: { $sum: "$score" },
          tests: {
            $push: { topic: "$topic", score: "$score" },
          },
        },
      },
      {
        $group: {
          _id: "$_id.studentId",
          student: { $first: "$student" },
          totalScore: { $sum: "$totalScore" },
          lessons: {
            $push: {
              lesson: "$_id.lesson",
              totalScore: { $sum: "$totalScore" },
              tests: "$tests",
            },
          },
        },
      },
      { $sort: { totalScore: -1 } },
    ]);

    // Foizlarni hisoblash
    for (const student of scores) {
      student.lessons.forEach((lesson) => {
        const totalTopics = lessonsData[lesson.lesson.toLowerCase()];
        lesson.tests.forEach((test) => {
          test.percentage = calculatePercentage(test.score, 1); // For individual topic
        });
        lesson.percentage = calculatePercentage(lesson.totalScore, totalTopics);
      });

      // Calculate and include student progress
      student.progress = await calculateStudentProgress(student._id);
    }

    res.status(200).json({
      message: "Barcha studentlarning test natijalari",
      data: scores,
    });
  } catch (error) {
    res.status(400).json({
      message: "Test natijalarini olishda xatolik",
      error: error.message || "Noma'lum xatolik",
    });
  }
});

// Student progress route
router.get("/student-progress/:studentId", async (req, res) => {
  const { studentId } = req.params;

  try {
    const progress = await calculateStudentProgress(studentId);
    res.json(progress);
  } catch (error) {
    console.error("Error in student progress route:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
