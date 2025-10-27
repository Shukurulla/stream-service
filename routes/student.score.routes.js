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

  const findStudent = await studentModel.findById(studentId);

  if (result.length === 0) {
    // If no results, create a default structure
    result.push({
      student: {
        profileImage: findStudent.profileImage,
        name: findStudent.name,
        group: findStudent.group,
      },
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

router.post("/scores", async (req, res) => {
  try {
    const { studentId, lesson, topic, score } = req.body;

    // Yechilgan testni qidirish
    const existingScore = await studentScoreModel.findOne({
      studentId,
      lesson,
      topic,
    });

    const findStudent = await studentModel.findById(studentId);

    if (!findStudent) {
      return res.status(400).json({ message: "Bunday student topilmadi" });
    }

    if (existingScore) {
      // Agar shu test avval yechilgan bo'lsa, mavjud natijani yangilash
      existingScore.score = score;
      await existingScore.save();

      return res
        .status(200)
        .json({ message: "Natija yangilandi", data: existingScore });
    } else {
      // Agar test yechilmagan bo'lsa, yangi natija yaratish
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

      return res
        .status(201)
        .json({ message: "Natija muvaffaqiyatli qo'shildi", data: newScore });
    }
  } catch (error) {
    return res
      .status(400)
      .json({ message: "Test natijasini saqlashda xatolik", error });
  }
});

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
          topicsCompleted: { $addToSet: "$topic" }, // Collect unique completed topics per lesson
        },
      },
      {
        $group: {
          _id: "$_id.studentId",
          student: { $first: "$student" },
          totalTopicsCompleted: { $sum: { $size: "$topicsCompleted" } },
          lessons: {
            $push: {
              lesson: "$_id.lesson",
              topicsCompleted: { $size: "$topicsCompleted" },
            },
          },
        },
      },
      { $sort: { totalTopicsCompleted: -1 } },
    ]);

    for (const student of scores) {
      student.lessons.forEach((lesson) => {
        const totalTopicsInLesson =
          lessonsData[lesson.lesson.toLowerCase()] || 0;
        lesson.percentage =
          Math.round((lesson.topicsCompleted / totalTopicsInLesson) * 100) || 0;
      });

      // Here we ensure that lessons are structured correctly in the response
      student.lessons = student.lessons.map((lesson) => ({
        lesson: lesson.lesson,
        totalTopicsCompleted: lesson.topicsCompleted,
        percentage: lesson.percentage,
      }));

      // Optionally include progress calculation if needed
      student.progress = await calculateStudentProgress(student._id);
    }

    return res.status(200).json({
      message: "Barcha studentlarning test natijalari",
      data: scores,
    });
  } catch (error) {
    return res.status(400).json({
      message: "Test natijalarini olishda xatolik",
      error: error.message || "Noma'lum xatolik",
    });
  }
});

router.get("/lessons/:lesson", async (req, res) => {
  try {
    const { lesson } = req.params;

    const scores = await studentScoreModel.aggregate([
      { $match: { lesson } },
      {
        $group: {
          _id: "$studentId",
          student: { $first: "$student" },
          topicsCompleted: { $addToSet: "$topic" },
        },
      },
      {
        $lookup: {
          from: "students",
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
          totalTopicsCompleted: { $size: "$topicsCompleted" },
        },
      },
      {
        $project: {
          totalTopicsCompleted: 1,
          percentage: {
            $round: [
              {
                $multiply: [
                  {
                    $divide: [
                      "$totalTopicsCompleted",
                      lessonsData[lesson.toLowerCase()],
                    ],
                  },
                  100,
                ],
              },
              0,
            ],
          },
          student: 1,
        },
      },
      { $sort: { totalTopicsCompleted: -1 } },
    ]);

    return res.status(200).json({
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
          topicsCompleted: { $addToSet: "$topic" }, // Collect topics completed by student
        },
      },
      {
        $group: {
          _id: "$_id.studentId",
          student: { $first: "$student" },
          totalTopicsCompleted: {
            $sum: { $size: "$topicsCompleted" },
          },
          lessons: {
            $push: {
              lesson: "$_id.lesson",
              topicsCompleted: { $size: "$topicsCompleted" },
            },
          },
        },
      },
      { $sort: { totalTopicsCompleted: -1 } }, // Students sorted by total topics completed
    ]);

    // Foizlarni hisoblash
    for (const student of scores) {
      student.lessons.forEach((lesson) => {
        const totalTopicsInLesson = lessonsData[lesson.lesson.toLowerCase()];
        lesson.percentage =
          Math.round((lesson.topicsCompleted / totalTopicsInLesson) * 100) || 0; // Calculate percentage
      });

      // Set student progress if needed (as previously calculated)
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
