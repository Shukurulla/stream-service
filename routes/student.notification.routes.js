import { Router } from "express";
import studentNotificationModel from "../models/student.notification.model.js";
import authMiddleware from "../middleware/auth.middleware.js";
import Stream from "../models/stream.model.js";
import studentModel from "../models/student.model.js";
import teacherModel from "../models/teacher.model.js";
import ThemeFeedbackModel from "../models/theme-feedback.model.js";
import path from "path";
import fs from "fs";

import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

router.get(
  "/notifications/teacher/:number",
  authMiddleware,
  async (req, res) => {
    try {
      const { userId } = req.userData;
      const notifications = await studentNotificationModel.find({
        "from.id": userId,
        "student.group": req.params.number,
      });
      const themeFeedbacks = await ThemeFeedbackModel.find({
        "from.id": userId,
        "student.group": req.params.number,
      });
      res.json(notifications);
    } catch (error) {}
  }
);

/**
 * @swagger
 * /notifications:
 *   post:
 *     summary: "Yangi bildirishnomani yaratish"
 *     tags: [Notification(Student)]
 *     description: "Yangi bildirishnoma yaratish va saqlash"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stream:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     description: "Streamning unikal identifikatori"
 *                   title:
 *                     type: string
 *                     description: "Streamning sarlavhasi"
 *                   name:
 *                     type: string
 *                     description: "Stream o'qituvchisi ismi"
 *                   profileImage:
 *                     type: string
 *                     description: "O'qituvchining profil rasmi URL"
 *               student:
 *                 type: string
 *                 description: "Talabaning unikal identifikatori"
 *               from:
 *                 type: object
 *                 properties:
 *                   profileImage:
 *                     type: string
 *                     description: "O'qituvchining profil rasmi URL"
 *                   name:
 *                     type: string
 *                     description: "O'qituvchining ismi"
 *                   science:
 *                     type: string
 *                     description: "O'qituvchining fani"
 *               rate:
 *                 type: integer
 *                 description: "Tomoshabinning bahosi"
 *               feedback:
 *                 type: string
 *                 description: "Tomoshabinning fikri"
 *     responses:
 *       201:
 *         description: "Bildirishnoma muvaffaqiyatli yaratildi"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: "Server xatosi"
 */

router.post("/notifications", async (req, res) => {
  try {
    const { stream, student, from, rate, feedback } = req.body;
    let voiceMessagePath = "";

    // Agar fayl yuborilgan bo'lsa, uni tekshiramiz va saqlaymiz
    if (req.files && req.files.voiceMessage) {
      const voiceMessage = req.files.voiceMessage;

      // Fayl formati tekshirish (mp3)
      if (!voiceMessage.mimetype.startsWith("audio/mpeg")) {
        return res
          .status(400)
          .json({ message: "Faqat MP3 fayllar qabul qilinadi" });
      }

      // Fayl nomini yaratish
      const fileName = Date.now() + "_" + voiceMessage.name;
      const filePath = path.join(__dirname, "../public/voices", fileName);

      // Faylni saqlash
      await voiceMessage.mv(filePath);
      voiceMessagePath = `/public/voices/${fileName}`; // Fayl yo'li
    }

    // Stream, Student va Teacher ma'lumotlarini tekshirish
    const findStream = await Stream.findById(stream);
    const findStudent = await studentModel.findById(student);
    const findTeacher = await teacherModel.findById(from);

    if (!findStream) {
      return res.status(400).json({ message: "Bunday stream topilmadi" });
    }
    if (!findStudent) {
      return res.status(400).json({ message: "Bunday student topilmadi" });
    }
    if (!findTeacher) {
      return res.status(400).json({ message: "Bunday teacher topilmadi" });
    }

    // Notification yaratish
    const schema = {
      rate,
      feedback: feedback || "", // Agar feedback bo'sh bo'lsa, bo'sh qator qo'yiladi
      voiceMessage: voiceMessagePath, // Agar fayl bo'lsa, yo'lni saqlaydi, bo'lmasa bo'sh qoladi
      stream: {
        streamId: findStream._id,
        title: findStream.title,
        name: findStream.teacher.name,
        profileImage: findStream.teacher.profileImage,
      },
      student: {
        name: findStudent.name,
        group: findStudent.group,
        profileImage: findStudent.profileImage,
        id: findStudent._id,
      },
      from: {
        profileImage: findTeacher.profileImage,
        name: findTeacher.name,
        science: findTeacher.science,
        id: findTeacher._id,
      },
    };

    const notification = await studentNotificationModel.create(schema);
    if (!notification) {
      return res
        .status(500)
        .json({ message: "Notification yuborishda xatolik ketdi" });
    }
    res.json(notification);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating notification", error: error.message });
  }
});

/**
 * @swagger
 * /notifications/{studentId}:
 *   get:
 *     summary: "Talabaga tegishli barcha bildirishnomalarni olish va o'rtacha reytingni hisoblash"
 *     tags: [Notification(Student)]
 *     description: "Talabaga tegishli barcha bildirishnomalarni olish va ularning o'rtacha reytingini hisoblash"
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         description: "Talabaning unikal identifikatori"
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: "Bildirishnomalar va o'rtacha reyting muvaffaqiyatli qaytarildi"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notifications:
 *                   type: array
 *                   items:
 *                     type: object
 *                 averageRating:
 *                   type: number
 *                   format: float
 *       404:
 *         description: "Bildirishnomalar topilmadi"
 *       500:
 *         description: "Server xatosi"
 */
router.get("/notifications/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;

    // Talabani tekshirish
    const findStudent = await studentModel.findById(studentId);
    if (!findStudent) {
      return res.status(400).json({ message: "Bunday student topilmadi" });
    }

    // studentNotificationModel dan ma'lumotlarni olish
    const studentNotifications = await studentNotificationModel.find({
      "student.id": studentId,
    });

    // themeFeedbackModel dan ma'lumotlarni olish
    const themeFeedbacks = await ThemeFeedbackModel.find({
      "student.id": studentId,
    });

    // Ratinglarni hisoblash
    let totalRating = 0;
    let totalFeedbacks = 0;

    // studentNotificationModel ratinglarini qo'shish
    studentNotifications.forEach((notification) => {
      if (notification.rate) {
        totalRating += notification.rate;
        totalFeedbacks += 1;
      }
    });

    // themeFeedbackModel ratinglarini qo'shish
    themeFeedbacks.forEach((feedback) => {
      if (feedback.rating) {
        totalRating += feedback.rating;
        totalFeedbacks += 1;
      }
    });

    const averageRating = totalFeedbacks > 0 ? totalRating / totalFeedbacks : 0;

    // Ma'lumotlarni birlashtirish va bir xil formatda qaytarish
    const formattedNotifications = [
      ...studentNotifications.map((notification) => ({
        from: notification.from,
        rate: notification.rate || null,
        feedback: notification.feedback || null,
        createdAt: notification.createdAt,
      })),
      ...themeFeedbacks.map((feedback) => ({
        from: feedback.teacher,
        rate: feedback.rating || null,
        feedback: feedback.feedback || null,
        createdAt: feedback.createdAt,
      })),
    ];

    res.status(200).json({
      notifications: formattedNotifications,
      averageRating,
    });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving notifications", error });
  }
});

router.get("/notifications/rating/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;

    await studentNotificationModel.updateMany({
      $set: { createdAt: new Date() },
    });

    // Talabani tekshirish
    const findStudent = await studentModel.findById(studentId);
    if (!findStudent) {
      return res.status(400).json({ message: "Bunday student topilmadi" });
    }

    // studentNotificationModel dan ma'lumotlarni olish
    const studentNotifications = await studentNotificationModel.find({
      "student.id": studentId,
    });

    // themeFeedbackModel dan ma'lumotlarni olish
    const themeFeedbacks = await ThemeFeedbackModel.find({
      "student.id": studentId,
    });

    // Bugungi sana va 5 kun oldingi sana
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Bugunning oxiri
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(today.getDate() - 5);
    fiveDaysAgo.setHours(0, 0, 0, 0); // 5 kun oldingi kunning boshi

    console.log("Bugungi sana:", today);
    console.log("5 kun oldingi sana:", fiveDaysAgo);

    // Ma'lumotlarni birlashtirish
    const allNotifications = [
      ...studentNotifications.map((notification) => ({
        from: notification.from,
        rate: notification.rate || null,
        feedback: notification.feedback || null,
        createdAt: notification.createdAt
          ? new Date(notification.createdAt)
          : null, // Agar `createdAt` mavjud bo‘lsa, `Date` ga o‘girish
      })),
      ...themeFeedbacks.map((feedback) => ({
        from: feedback.teacher,
        rate: feedback.rating || null,
        feedback: feedback.feedback || null,
        createdAt: feedback.createdAt ? new Date(feedback.createdAt) : null,
      })),
    ];

    console.log("Barcha ma'lumotlar:", allNotifications);

    // 5 kun ichidagi ma'lumotlarni olish
    const recentNotifications = allNotifications.filter((notification) => {
      if (!notification.createdAt || isNaN(notification.createdAt.getTime())) {
        console.log("Noto‘g‘ri sana:", notification);
        return false;
      }
      return (
        notification.createdAt >= fiveDaysAgo && notification.createdAt <= today
      );
    });

    console.log("5 kun ichidagi ma'lumotlar:", recentNotifications);

    // `from.science` bo'yicha guruhlash
    const groupedByScience = {};

    recentNotifications.forEach((notification) => {
      const science = notification.from.science;
      const date = new Date(notification.createdAt);
      const formattedDate = `${String(date.getDate()).padStart(
        2,
        "0"
      )}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;

      if (!groupedByScience[science]) {
        groupedByScience[science] = [];
      }

      // Yangi sanani qo'shish
      const existingDate = groupedByScience[science].find(
        (item) => item.date === formattedDate
      );
      if (existingDate) {
        existingDate.ratings.push({
          from: notification.from,
          rate: notification.rate,
          feedback: notification.feedback,
        });
        existingDate.totalRating += notification.rate || 0;
      } else {
        groupedByScience[science].push({
          date: formattedDate,
          ratings: [
            {
              from: notification.from,
              rate: notification.rate,
              feedback: notification.feedback,
            },
          ],
          totalRating: notification.rate || 0,
        });
      }
    });

    // Final ma'lumotni formatlash
    const response = Object.keys(groupedByScience).map((science) => ({
      science,
      ratings: groupedByScience[science].map((item) => ({
        date: item.date,
        ratings: item.ratings,
        totalRating: item.totalRating,
      })),
    }));

    res.status(200).json(response);
  } catch (error) {
    console.error("Xatolik:", error);
    res.status(500).json({ message: "Error retrieving notifications", error });
  }
});

router.get("/notification/:userId/length", async (req, res) => {
  try {
    const { userId } = req.params;
    const student = await studentModel.findById(userId);
    if (!student) {
      return res.json({ message: "Bunday Student topilmadi" });
    }
    const findNotifications = await studentNotificationModel.find({
      student: userId,
      read: false,
    });

    res.json({ length: findNotifications.length });
  } catch (error) {
    res.json({ message: error.message });
  }
});

/**
 * @swagger
 * /notifications/notification/{id}:
 *   get:
 *     summary: "ID bo'yicha bitta bildirishnomani olish"
 *     tags: [Notification(Student)]
 *     description: "ID bo'yicha bitta bildirishnomani olish"
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: "Bildirishnomaning unikal identifikatori"
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: "Bildirishnoma muvaffaqiyatli qaytarildi"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: "Bildirishnoma topilmadi"
 *       500:
 *         description: "Server xatosi"
 */
router.get("/notifications/notification/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Find notification by ID
    const notification = await studentNotificationModel.findById(id);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found." });
    }

    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving notification", error });
  }
});

/**
 * @swagger
 * /notifications/{studentId}/read:
 *   put:
 *     summary: "Talabaga tegishli barcha bildirishnomalarni o'qilgan deb belgilash"
 *     tags: [Notification(Student)]
 *     description: "Talabaga tegishli barcha bildirishnomalarni o'qilgan deb belgilash"
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         description: "Talabaning unikal identifikatori"
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: "Barcha bildirishnomalar o'qilgan deb belgilandi"
 *       500:
 *         description: "Server xatosi"
 */
router.put(
  "/notifications/:studentId/read",
  authMiddleware,
  async (req, res) => {
    const { studentId } = req.params;

    try {
      // Update all notifications for the student to set `read` to true
      await studentNotificationModel.updateMany(
        { student: studentId },
        { $set: { read: true } } // Mark all notifications as read
      );

      res.status(200).json({ message: "All notifications marked as read" });
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  }
);

/**
 * @swagger
 * /notification/{id}:
 *   delete:
 *     summary: Delete notification
 *     tags: [Notification(Student)]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Notification ID
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Server error
 */
router.delete("/notification/:id", authMiddleware, async (req, res) => {
  try {
    const notification = await studentNotificationModel.findByIdAndDelete(
      req.params.id
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json({ message: "Notification deleted successfully" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
