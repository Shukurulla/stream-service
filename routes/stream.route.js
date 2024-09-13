import express from "express";
import streamModel from "../models/stream.model.js";
import axios from "axios";
import authMiddleware from "../middleware/auth.middleware.js";
import { config } from "dotenv";
import groupModel from "../models/group.model.js";

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
    const { group } = req.body;
    const findGroup = await groupModel.find({ name: group });
    if (findGroup.length !== 1) {
      return res.json({ error: "Bunday gruppa mavjud emas" });
    }
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

    const stream = await streamModel.create({
      ...req.body,
      streamInfo: response.data,
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
 *     tags: [Stream]
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
    const allStreams = await streamModel.find();
    const compareBroadCasting = allStreams.filter(
      (c) => c.streamInfo.broadcasting == false
    );
    const streams = compareBroadCasting?.filter((c) => c.isEnded == false);
    if (streams.length == 0) {
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
 * /streams/previous:
 *   get:
 *     summary: "Tugatilgan streamlarni sanalangan formatda olish"
 *     tags: [Stream]
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
router.get("/streams/previous", async (req, res) => {
  try {
    const currentTime = new Date();

    const streams = await streamModel
      .find({ endedTime: { $exists: true, $ne: null } })
      .sort({ endedTime: -1 }) // endedTime bo'yicha teskari tartibda saralash
      .lean(); // Performance uchun lean() ishlatamiz

    // endedTime ni Date obyektiga aylantirish va farqni hisoblash
    const streamsWithTimeDiff = streams.map((stream) => {
      const endedTime = new Date(stream.endedTime);
      const timeDiff = Math.abs(currentTime - endedTime);
      return { ...stream, timeDiff };
    });

    // timeDiff bo'yicha saralash
    streamsWithTimeDiff.sort((a, b) => a.timeDiff - b.timeDiff);

    res.json(streamsWithTimeDiff);
  } catch (error) {
    console.error("Xatolik yuz berdi:", error);
    res.status(500).json({ message: "Serverda xatolik yuz berdi" });
  }
});

router.get("/streams/all", async (req, res) => {
  try {
    const streams = await streamModel.find();
    res.json(streams);
  } catch (error) {
    res.json({ error: error.message });
  }
});

/**
 * @swagger
 * /streams/live:
 *   get:
 *     summary: "Hozirgi faol streamlarni olish"
 *     tags: [Stream]
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
    const streams = await streamModel.find({
      streamInfo: { broadcasting: true },
    });
    res.json(streams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /streams/{id}/start:
 *   put:
 *     summary: "Streamni boshlash"
 *     tags: [Stream]
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
 *     tags: [Stream]
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
        endedTime: new Date(),
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
 * /streams/{id}/edit:
 *   put:
 *     summary: Stream ma'lumotlarini yangilash
 *     description: Berilgan ID bo'yicha stream ma'lumotlarini yangilash.
 *     tags:
 *       - Streams
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Streamning ID raqami
 *         schema:
 *           type: string
 *       - in: body
 *         name: body
 *         description: Yangilanishi kerak bo'lgan stream ma'lumotlari
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             title:
 *               type: string
 *               description: Streamning yangi nomi
 *             description:
 *               type: string
 *               description: Stream haqida yangi tavsif
 *             planStream:
 *               type: string
 *               format: date-time
 *               description: Streamning rejalashtirilgan vaqti
 *             classRoom:
 *               type: string
 *               description: O‘quv xonasi raqami
 *     responses:
 *       200:
 *         description: Stream muvaffaqiyatli yangilandi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   description: Streamning ID raqami
 *                 title:
 *                   type: string
 *                   description: Streamning nomi
 *                 description:
 *                   type: string
 *                   description: Stream haqida tavsif
 *                 planStream:
 *                   type: string
 *                   format: date-time
 *                   description: Streamning rejalashtirilgan vaqti
 *                 classRoom:
 *                   type: string
 *                   description: O‘quv xonasi raqami
 *       400:
 *         description: Kiritilgan ID raqami noto'g'ri
 *       404:
 *         description: Stream topilmadi
 *       500:
 *         description: Serverda xatolik yuz berdi
 */

router.put("/streams/:id/edit", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const stream = await streamModel.findByIdAndUpdate(
      id,
      {
        $set: req.body,
      },
      { new: true }
    );

    if (!stream) {
      return res.json({ error: "Stream ozgartirilmadi" });
    }
    const currentStream = await streamModel.findById(id);
    res.json(currentStream);
  } catch (error) {
    res.json({ error: error.message });
  }
});

/**
 * @swagger
 * /streams/{id}/viewers:
 *   post:
 *     summary: "Streamga yangi tomoshabin qo'shish"
 *     tags: [Stream]
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
    const { name, userId, profileImage, science } = req.body;

    // Streamni topish
    const stream = await streamModel.findById(id);
    if (!stream) {
      return res.status(404).json({ message: "Stream topilmadi" });
    }

    // Tomoshabin mavjudligini tekshirish
    const isViewerExists = stream.viewers.filter(
      (viewer) => viewer.id === userId
    );

    if (isViewerExists) {
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

/**
 * @swagger
 * /stream/{id}/delete:
 *   delete:
 *     summary: Delete stream
 *     tags: [Stream]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Stream ID
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stream deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Stream not found
 *       500:
 *         description: Server error
 */
router.delete("/stream/:id/delete", authMiddleware, async (req, res) => {
  try {
    const stream = await streamModel.findByIdAndDelete(req.params.id);

    if (!stream) {
      return res.status(404).json({ message: "Stream not found" });
    }

    res.status(200).json({ message: "Stream deleted successfully" });
  } catch (error) {
    console.error("Error deleting stream:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
