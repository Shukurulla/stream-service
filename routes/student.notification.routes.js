import { Router } from "express";
import studentNotificationModel from "../models/student.notification.model.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = Router();

// CREATE a new notification
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

// READ all notifications for a specific student and calculate the average rating
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

// READ a single notification by ID
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
