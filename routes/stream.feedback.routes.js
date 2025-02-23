import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import { verifyToken } from "../middleware/verifyToken.middleware.js";
import streamModel from "../models/stream.model.js";
import teacherModel from "../models/teacher.model.js";
const router = express.Router();

router.get("/feedbacks/", authMiddleware, async (req, res) => {
  try {
    const { userId } = await req.userData;
    const findTeacher = await teacherModel.findById(userId);
    if (!findTeacher) {
      return res.status(400).json({ message: "Bunday teacher topilmadi" });
    }
  } catch (error) {}
});

/**
 * @swagger
 * /stream/{id}/feedback:
 *   post:
 *     summary: Stream uchun yangi feedback (comment va rating) qo'shish
 *     tags: [Stream Feedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Stream ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               userName:
 *                 type: string
 *               commentText:
 *                 type: string
 *               teacherName:
 *                 type: string
 *               profileImage:
 *                 type: string
 *               science:
 *                 type: string
 *               rate:
 *                 type: number
 *               feedback:
 *                 type: string
 *     responses:
 *       200:
 *         description: Comment va rating muvaffaqiyatli qo'shildi
 *       404:
 *         description: Stream topilmadi
 *       500:
 *         description: Server xatosi
 */
router.post("/stream/:id/feedback", verifyToken, async (req, res) => {
  const { teacher, rate, feedback, quests } = req.body;
  const { id } = req.params;
  const findTeacher = await teacherModel.findById(teacher.id);

  const stream = await streamModel.findById(id);
  if (!stream) {
    return res
      .status(400)
      .json({ status: "error", message: "Bunday stream topilmadi" });
  }
  const ratings = stream.rating.ratings.filter(
    (c) => c.teacher.id == teacher.id
  );

  if (ratings.length > 0) {
    return res.json({ message: "Siz oldin feedback bergansiz" });
  }

  if (!findTeacher) {
    return res.status(400).json({ message: "Bunday teacher topilmadi" });
  }
  const { profileImage } = findTeacher;

  try {
    await streamModel.updateOne(
      { _id: id },
      {
        $push: {
          "rating.ratings": {
            teacher: { ...teacher, profileImage },
            rate,
            comment: feedback,
            quests,
          },
        },
      }
    );

    const stream = await streamModel.findById(id);
    const totalRatings =
      stream.rating.ratings.reduce((sum, rating) => sum + rating.rate, 0) /
      stream.rating.ratings.length;
    await streamModel.updateOne(
      { _id: id },
      { $set: { "rating.totalRating": totalRatings } }
    );
    const newStream = await streamModel.findById(id);
    res.status(200).json(newStream);
  } catch (error) {
    res.status(500).json({ message: "Server error: " + error.message });
  }
});

/**
 * @swagger
 * /stream/{id}/feedbacks:
 *   get:
 *     summary: Stream uchun barcha feedbacklarni olish
 *     tags: [Stream Feedback]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Stream ID
 *     responses:
 *       200:
 *         description: Feedbacklar muvaffaqiyatli olindi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 feedbacks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Feedback'
 *                 averageRating:
 *                   type: number
 *       404:
 *         description: Stream topilmadi
 *       500:
 *         description: Server xatosi
 */
router.get("/stream/:id/feedbacks", async (req, res) => {
  try {
    const { id } = req.params;

    // Stream topish
    const stream = await streamModel.findById(id);

    if (!stream) {
      return res.status(404).json({ message: "Bunday stream topilmadi" });
    }

    const rating = stream.rating;
    const comment = stream.comments;

    res.json({ data: { rating, comment } });
  } catch (error) {
    console.error("Error retrieving feedbacks:", error);
    res.status(500).json({ message: "Server error" });
  }
});
/**
 * @swagger
 * /streams/{streamId}/read:
 *   put:
 *     summary: Barcha feedbacklarni o'qilgan deb belgilash
 *     tags: [Stream Feedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: streamId
 *         required: true
 *         schema:
 *           type: string
 *         description: Stream ID
 *     responses:
 *       200:
 *         description: Barcha feedbacklar o'qilgan deb belgilandi
 *       404:
 *         description: Stream topilmadi
 *       500:
 *         description: Server xatosi
 */
router.put("/streams/:streamId/read", verifyToken, async (req, res) => {
  try {
    const { streamId } = req.params;

    // Stream topish
    const stream = await streamModel.findById(streamId);
    if (!stream) {
      return res.status(404).json({ message: "Stream not found" });
    }

    // Feedbacklarni o'qilgan deb belgilash
    await feedbackModel.updateMany({ streamId }, { read: true });

    res.status(200).json({ message: "All feedbacks marked as read" });
  } catch (error) {
    console.error("Error marking feedbacks as read:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Feedback:
 *       type: object
 *       properties:
 *         teacher:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             profileImage:
 *               type: string
 *             science:
 *               type: string
 *         rate:
 *           type: number
 *         feedback:
 *           type: string
 *         date:
 *           type: string
 *           format: date-time
 *         read:
 *           type: boolean
 */

/**
 * @swagger
 * /feedback/{id}:
 *   delete:
 *     summary: Delete feedback
 *     tags: [Stream Feedback]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Feedback ID
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Feedback deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Feedback not found
 *       500:
 *         description: Server error
 */
router.delete("/feedback/:id", verifyToken, async (req, res) => {
  try {
    const feedback = await feedbackModel.findByIdAndDelete(req.params.id);

    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }

    res.status(200).json({ message: "Feedback deleted successfully" });
  } catch (error) {
    console.error("Error deleting feedback:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
