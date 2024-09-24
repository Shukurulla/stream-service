import { Router } from "express";
import studentNotificationModel from "../models/student.notification.model.js";
import authMiddleware from "../middleware/auth.middleware.js";
import Stream from "../models/stream.model.js";
import studentModel from "../models/student.model.js";

const router = Router();

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
    const notificationData = req.body;
    const stream = Stream.findById(notificationData.stream.streamId);
    if (!stream) {
      return res.json({ error: "Bunday stream topilmadu" });
    }

    // Create and save the new notification
    const newNotification = await studentNotificationModel.create(
      notificationData
    );

    res.status(201).json(newNotification);
  } catch (error) {
    res.status(500).json({ message: "Error creating notification", error });
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

    const findStudent = await studentModel.findById(studentId);

    if (!findStudent) {
      return res.status(400).json({ message: "Bunday student topilmadi" });
    }

    // Find all notifications for the student by their ID
    const notifications = await studentNotificationModel.find({
      student: studentId,
    });

    // Calculate the average rating for all notifications
    let totalRating = 0;
    let totalFeedbacks = 0;

    notifications.forEach((notification) => {
      if (notification.rate) {
        totalRating += notification.rate;
        totalFeedbacks += 1;
      }
    });

    const averageRating = totalFeedbacks > 0 ? totalRating / totalFeedbacks : 0;

    res.status(200).json({
      notifications,
      averageRating,
    });
  } catch (error) {
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
