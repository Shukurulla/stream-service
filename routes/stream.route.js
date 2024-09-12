import express from "express";
import streamModel from "../models/stream.model.js";
import axios from "axios";
import authMiddleware from "../middleware/auth.middleware.js";
import { config } from "dotenv";

const router = express.Router();
config();
const apiVideoToken = process.env.API_VIDEO_KEY;

/**
 * @swagger
 * /create-stream:
 *   post:
 *     summary: Yangi stream yaratish
 *     tags: [Stream]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - classRoom
 *               - teacher
 *             properties:
 *               title:
 *                 type: string
 *                 description: Stream sarlavhasi
 *               description:
 *                 type: string
 *                 description: Stream tavsifi (ixtiyoriy)
 *               classRoom:
 *                 type: string
 *                 description: Stream o'tkaziladigan sinf xonasi
 *               teacher:
 *                 type: object
 *                 description: O'qituvchi ma'lumotlari
 *     responses:
 *       200:
 *         description: Stream muvaffaqiyatli yaratildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Stream'
 *       400:
 *         description: Noto'g'ri so'rov
 *       401:
 *         description: Autentifikatsiya xatosi
 *       500:
 *         description: Server xatosi
 */
router.post("/create-stream", authMiddleware, async (req, res) => {
  try {
    // API so'rovi yuboramiz
    const response = await axios.post(
      "https://ws.api.video/live-streams",
      {
        name: req.body.title,
        record: true, // Streamni saqlash (record) uchun true qilib belgilaymiz
      },
      {
        headers: {
          Authorization: `Bearer ${apiVideoToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (!response.data) {
      return res.status(400).json({ error: "Stream yaratilmadi" });
    }
    const streamSchema = {
      title: req.body.title,
      description: req.body.description ? req.body.description : "",
      classRoom: req.body.classRoom,
      streamInfo: response.data,
      teacher: req.body.teacher,
    };
    if (!streamSchema) {
      return res.status(400).json({ error: "Stream yaratishda xatolik ketti" });
    }
    const stream = await streamModel.create({
      ...req.body,
      streamInfo: streamSchema,
    });
    // API'dan olingan javobni qaytaramiz
    res.status(200).json(stream);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to create stream",
      error: error.response ? error.response.data : error.message,
    });
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Stream:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         classRoom:
 *           type: string
 *         streamInfo:
 *           type: object
 *         teacher:
 *           type: object
 */

/**
 * @swagger
 * /streams/soon:
 *   get:
 *     summary: "Yaqinda tashkil qilinishi rejalashtirilgan streamlarni olish"
 *     description: "Barcha streamlarni qaytaradi, agar `isStart` false bo‘lsa"
 *     responses:
 *       200:
 *         description: "Yaqinda tashkil qilinishi rejalashtirilgan streamlar"
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     description: "Streamning unikal identifikatori"
 *                   title:
 *                     type: string
 *                     description: "Streamning nomi"
 *                   description:
 *                     type: string
 *                     description: "Streamning tavsifi"
 *                   isStart:
 *                     type: boolean
 *                     description: "Streamning boshlanish holati"
 *       404:
 *         description: "Streamlar topilmadi"
 *       500:
 *         description: "Server xatosi"
 */
router.get("/streams/soon", async (req, res) => {
  try {
    const streams = await streamModel.find({ isStart: false });
    if (!streams) {
      return res.json({
        error: "Yaqinda tashkil qilinishi rejalashtirilgan streamlar topilmadi",
      });
    }
    res.json(streams);
  } catch (error) {
    res.json({ error: error.message });
  }
});

/**
 * @swagger
 * /streams/preview:
 *   get:
 *     summary: "Tugatilgan streamlarni sanalangan formatda olish"
 *     description: "Tugatilgan streamlarni yil, oy va kun bo‘yicha guruhlab, sanalangan formatda qaytaradi"
 *     responses:
 *       200:
 *         description: "Sanalangan streamlar ro‘yxati"
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   date:
 *                     type: string
 *                     format: date
 *                     description: "Stream rejalashtirilgan sana (YYYY-MM-DD formatida)"
 *                   streams:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           description: "Streamning unikal identifikatori"
 *                         title:
 *                           type: string
 *                           description: "Streamning nomi"
 *                         planStream:
 *                           type: string
 *                           format: date-time
 *                           description: "Stream rejalashtirilgan sana va vaqt"
 *                         isEnded:
 *                           type: boolean
 *                           description: "Stream tugatilganligini ko‘rsatuvchi flag"
 *       500:
 *         description: "Server xatosi"
 */
router.get("/streams/preview", async (req, res) => {
  try {
    const streams = await Stream.aggregate([
      {
        $match: { isEnded: true },
      },
      {
        $sort: { planStream: 1 },
      },
      {
        $group: {
          _id: {
            year: { $year: "$planStream" },
            month: { $month: "$planStream" },
            day: { $dayOfMonth: "$planStream" },
          },
          streams: { $push: "$$ROOT" },
        },
      },
      {
        $project: {
          _id: 0,
          date: { $dateToString: { format: "%Y-%m-%d", date: "$_id" } },
          streams: 1,
        },
      },
    ]);

    res.json(streams);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching streams" });
  }
});

/**
 * @swagger
 * /streams/live:
 *   get:
 *     summary: "Hozirgi faol streamlarni olish"
 *     description: "Faol streamlarni olish, ya'ni `isStart` qiymati `true` bo‘lgan streamlar."
 *     responses:
 *       200:
 *         description: "Faol streamlar ro‘yxati"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 streams:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: "Streamning unikal identifikatori"
 *                       title:
 *                         type: string
 *                         description: "Streamning nomi"
 *                       planStream:
 *                         type: string
 *                         format: date-time
 *                         description: "Stream rejalashtirilgan sana va vaqt"
 *                       isStart:
 *                         type: boolean
 *                         description: "Streamning boshlanish holati"
 *       500:
 *         description: "Server xatosi"
 */
router.get("/streams/live", async (req, res) => {
  try {
    const streams = await streamModel.find({ isStart: true });
    res.json({ streams });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /streams/{id}/start:
 *   put:
 *     summary: "Streamni boshlash"
 *     description: "Streamni boshlash uchun `isStart` holatini `true` ga o‘zgartiradi. `id` bo‘yicha streamni topadi va yangilaydi."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: "Streamning unikal identifikatori"
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "Yangilangan stream ma'lumotlari"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   description: "Streamning unikal identifikatori"
 *                 title:
 *                   type: string
 *                   description: "Streamning nomi"
 *                 planStream:
 *                   type: string
 *                   format: date-time
 *                   description: "Stream rejalashtirilgan sana va vaqt"
 *                 isStart:
 *                   type: boolean
 *                   description: "Streamning boshlanish holati"
 *       400:
 *         description: "Yaroqsiz `id` yoki so‘rovda xatolik"
 *       404:
 *         description: "Stream topilmadi"
 *       500:
 *         description: "Server xatosi"
 */
router.put("/streams/:id/start", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const stream = await streamModel.findByIdAndUpdate(
      id,
      { isStart: true },
      { new: true }
    );
    if (!stream) {
      return res.status(404).json({ error: "Stream topilmadi" });
    }
    res.json(stream);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /streams/{id}/ended:
 *   put:
 *     summary: "Streamni tugatish"
 *     description: "Streamni tugatadi va `isEnded` holatini `true` ga, `isStart` holatini `false` ga o‘zgartiradi. `id` bo‘yicha streamni topadi va yangilaydi."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: "Streamning unikal identifikatori"
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "Yangilangan stream ma'lumotlari"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: "Yuqoridagi operatsiyaning muvaffaqiyatli bajarilgani haqida xabar"
 *                 stream:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       description: "Streamning unikal identifikatori"
 *                     title:
 *                       type: string
 *                       description: "Streamning nomi"
 *                     planStream:
 *                       type: string
 *                       format: date-time
 *                       description: "Stream rejalashtirilgan sana va vaqt"
 *                     isStart:
 *                       type: boolean
 *                       description: "Streamning boshlanish holati"
 *                     isEnded:
 *                       type: boolean
 *                       description: "Streamning tugash holati"
 *       404:
 *         description: "Stream topilmadi"
 *       500:
 *         description: "Server xatosi"
 */
router.put("/streams/:id/ended", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Streamni mavjudligini tekshirish
    const stream = await streamModel.findById(id);
    if (!stream) {
      return res.status(404).json({ error: "Stream topilmadi" });
    }

    // Streamni yangilash va muvaffaqiyatli yangilashni qaytarish
    const updatedStream = await streamModel.findByIdAndUpdate(
      id,
      {
        isEnded: true,
        isStart: false,
      },
      { new: true }
    ); // Yangilangan hujjatni qaytarish

    res.json({
      message: "Stream muvaffaqiyatli yangilandi",
      stream: updatedStream,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Streamni yangilashda xato" });
  }
});

/**
 * @swagger
 * /streams/{id}/viewers:
 *   post:
 *     summary: "Streamga yangi tomoshabin qo'shish"
 *     description: "Streamga yangi tomoshabin qo'shadi. Agar tomoshabin allaqachon mavjud bo'lsa, xato qaytaradi."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: "Streamning unikal identifikatori"
 *         schema:
 *           type: string
 *       - in: body
 *         name: body
 *         required: true
 *         description: "Tomoshabin haqida ma'lumot"
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *               description: "Tomoshabinning ismi"
 *             userId:
 *               type: string
 *               description: "Tomoshabinning unikal identifikatori"
 *             profileImage:
 *               type: string
 *               description: "Tomoshabinning profil rasm URL"
 *             science:
 *               type: string
 *               description: "Tomoshabinning bilim sohasi"
 *           required:
 *             - name
 *             - userId
 *     responses:
 *       200:
 *         description: "Tomoshabin muvaffaqiyatli qo'shildi"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: "Tomoshabin muvaffaqiyatli qo'shilganligi haqida xabar"
 *                 viewer:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       description: "Streamning unikal identifikatori"
 *                     viewers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             description: "Tomoshabinning ismi"
 *                           id:
 *                             type: string
 *                             description: "Tomoshabinning unikal identifikatori"
 *                           profileImage:
 *                             type: string
 *                             description: "Tomoshabinning profil rasm URL"
 *                           science:
 *                             type: string
 *                             description: "Tomoshabinning bilim sohasi"
 *       404:
 *         description: "Stream topilmadi"
 *       409:
 *         description: "Tomoshabin allaqachon mavjud"
 *       500:
 *         description: "Server xatosi"
 */
router.post("/streams/:id/viewers", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, userId, profileImage, science } = req.body; // Viewer data

    // Streamni topish
    const stream = await streamModel.findById(id);
    if (!stream) {
      return res.status(404).json({ message: "Stream topilmadi" });
    }

    // Tomoshabin mavjudligini tekshirish
    const isViewerExists = stream.viewers.filter(
      (viewer) => viewer.id === userId
    );

    if (isViewerExists.length > 0) {
      return res.status(409).json({ message: "Tomoshabin allaqachon mavjud" });
    }

    // Tomoshabinlarni yangilash
    const updatedStream = await streamModel.findByIdAndUpdate(
      id,
      {
        $push: { viewers: { name, id: userId, profileImage, science } },
      },
      { new: true }
    );

    res.json({
      message: "Tomoshabin muvaffaqiyatli qo'shildi",
      viewer: updatedStream,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Tomoshabin qo'shishda xato" });
  }
});

export default router;
