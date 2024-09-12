import { Router } from "express";
import studentNotificationModel from "../models/student.notification.model.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = Router();

/**
 * @swagger
 * /notifications:
 *   post:
 *     summary: "Yangi bildirishnomani yaratish"
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

    // Find all notifications for the student by their ID
    const notifications = await studentNotificationModel.find({
      student: studentId,
    });

    if (notifications.length === 0) {
      return res
        .status(404)
        .json({ message: "No notifications found for this student." });
    }

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

    res.json({
      notifications,
      averageRating,
    });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving notifications", error });
  }
});

/**
 * @swagger
 * /notifications/notification/{id}:
 *   get:
 *     summary: "ID bo'yicha bitta bildirishnomani olish"
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

export default router;
