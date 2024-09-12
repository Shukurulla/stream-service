import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import streamModel from "../models/stream.model.js";
const router = express.Router();

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
router.post("/stream/:id/feedback", authMiddleware, async (req, res) => {
  // ... (mavjud kod)
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
  // ... (mavjud kod)
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
router.put("/streams/:streamId/read", authMiddleware, async (req, res) => {
  // ... (mavjud kod)
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

export default router;
