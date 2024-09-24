import express from "express";
import groupModel from "../models/group.model.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * /create-group:
 *   post:
 *     summary: Yangi gruppa yaratish
 *     tags: [Group]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Gruppaning nomi
 *               kurs:
 *                 type: string
 *                 description: Gruppaning kursi
 *     responses:
 *       200:
 *         description: Gruppaning muvaffaqiyatli yaratilishi
 *       400:
 *         description: Gruppaning yaratilishida xato
 */
router.post("/create-group", authMiddleware, async (req, res) => {
  try {
    const group = await groupModel.create(req.body);
    if (!group) {
      return res.status(400).json({ message: "Gruppa yaratilmadi" });
    }
    res.json(group);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @swagger
 * /get-groups:
 *   get:
 *     summary: Barcha gruppalarni olish
 *     tags: [Group]
 *     responses:
 *       200:
 *         description: Gruppalar muvaffaqiyatli olindi
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Group'
 *       400:
 *         description: Gruppalar topilmadi yoki boshqa xatolik yuz berdi
 */
router.get("/get-groups", async (req, res) => {
  try {
    const groups = await groupModel.find();
    if (!groups) {
      return res.status(400).json({ message: "Gruppalar topilmadi" });
    }

    res.status(201).json(groups);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @swagger
 * /get-group/{id}:
 *   get:
 *     summary: Bitta gruppani olish
 *     tags: [Group]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Gruppaning ID raqami
 *     responses:
 *       200:
 *         description: Gruppa muvaffaqiyatli topildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Group'
 *       400:
 *         description: Gruppa topilmadi yoki boshqa xatolik
 */
router.get("/get-group/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const group = await groupModel.findById(id);

    if (!group) {
      return res.status(400).json({ message: "Gruppa topilmadi" });
    }
    res.json(group);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @swagger
 * /group/{id}/edit:
 *   put:
 *     summary: Gruppani tahrirlash
 *     tags: [Group]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Gruppa ID raqami
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Gruppaning nomi
 *               kurs:
 *                 type: string
 *                 description: Gruppaning kursi
 *     responses:
 *       200:
 *         description: Gruppa muvaffaqiyatli yangilandi
 *       400:
 *         description: Gruppa yangilanishida xato
 */
router.put("/group/:id/edit", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await groupModel.findByIdAndUpdate(id, req.body);
    const group = await groupModel.findById(id);
    if (!group) {
      return res.status(400).json({ message: "Gruppa ozgartirilmadi" });
    }
    res.json(group);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @swagger
 * /group/{id}/delete:
 *   delete:
 *     summary: Gruppani o'chirish
 *     tags: [Group]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Gruppa ID raqami
 *     responses:
 *       200:
 *         description: Gruppa muvaffaqiyatli o'chirildi
 *       400:
 *         description: Gruppa topilmadi yoki o'chirishda xato
 */
router.delete("/group/:id/delete", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const currentGroup = await groupModel.findById(id);
    if (!currentGroup) {
      return res.status(400).json({ message: "Bunday Gruppa topilmadi" });
    }
    await groupModel.findByIdAndDelete(id);
    res.json({ message: "Gruppa muaffaqiyatli ochirildi" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Group:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Gruppaning nomi
 *         kurs:
 *           type: string
 *           description: Gruppaning kursi
 */

export default router;
