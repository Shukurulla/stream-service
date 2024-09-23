import express from "express";
import streamModel from "../models/stream.model.js";
import axios from "axios";
import authMiddleware from "../middleware/auth.middleware.js";
import { config } from "dotenv";
import teacherModel from "../models/teacher.model.js";
import { verifyToken } from "../middleware/verifyToken.middleware.js";
import studentModel from "../models/student.model.js";
import testModel from "../models/test.model.js";

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
    const response = await axios.post(
      "https://ws.api.video/live-streams",
      {
        name: req.body.title,
        record: true,
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

    const findTeacher = await teacherModel.findById(req.body.teacher.id);

    if (!findTeacher) {
      return res.json({ error: "Bunday oqituvchi topilmadi" });
    }

    // Yaratilayotgan streamni konsolda ko'rish uchun qo'shamiz
    const stream = await streamModel.create({
      ...req.body,
      streamInfo: response.data,
      streamId: response.data.liveStreamId,
      planstream: new Date(),
      teacher: {
        name: findTeacher.name,
        profileImage: findTeacher.profileImage,
        id: findTeacher._id,
      },
    });

    res.status(200).json(stream);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to create stream",
      error: error.response ? error.response.data : error.message,
    });
  }
});

// Webhook uchun route yaratamiz
router.post("/webhook", async (req, res) => {
  const { type, liveStreamId } = req.body;

  // Stream boshlandi (stream.started) hodisasini ushlab olish
  await testModel.create({ data: req.body });
  if (type === "live-stream.broadcast.started") {
    const streamId = liveStreamId;
    await streamModel.findOneAndUpdate(
      { streamId },
      { isStart: true, isEnded: false }
    );
    await testModel.create({ data: req.body });

    // Bu yerda stream boshlandi deb qayd qilishingiz yoki ma'lumotni saqlashingiz mumkin
  }

  // Stream tugadi (stream.ended) hodisasini ushlab olish
  if (type === "live-stream.broadcast.ended") {
    const findStream = await streamModel.find({ streamId: liveStreamId });
    await streamModel.findOneAndUpdate(
      { streamId: liveStreamId },
      { isEnded: true, isStart: false }
    );
    await testModel.create({ data: req.body });
    // Video URL'ni saqlash yoki boshqa maqsadlarda ishlatish mumkin
  }
  if (
    type === "video.encoding.quality.completed" ||
    type === "video.source.recorded"
  ) {
    const videoId = req.body;
    // try {
    //   // Video ma'lumotlarini API.video'dan olish uchun so'rov yuboramiz
    //   const { data } = await axios.get(
    //     `https://ws.api.video/videos/${videoId}`,
    //     {
    //       headers: {
    //         Authorization: apiVideoToken, // Bu yerga o'z API kalitingizni qo'ying
    //       },
    //     }
    //   );

    //   // Video URL'ni javobdan olamiz
    //   const assets = data.assets;
    //   const findStream = await streamModel.findOne({ streamId: liveStreamId });

    //   await streamModel.findByIdAndUpdate(findStream._id, { assets });

    await testModel.create({ data: { videoId } });
  }
  res.status(200).send("Webhook qabul qilindi");
});

router.get("/test", async (req, res) => {
  const tests = await testModel.find();
  // for (let i = 0; i < tests.length; i++) {
  //   await testModel.findByIdAndDelete(tests[i]._id);
  // }
  res.json(tests.reverse());
});

router.get("/stream/:liveStreamId", async (req, res) => {
  const { liveStreamId } = req.params;
  try {
    const { data } = await axios.get(`https://ws.api.video/videos`, {
      headers: {
        Authorization: `Bearer ${apiVideoToken}`, // Bu yerda API kalitingizni kiriting
      },
    });

    const stream = data.data.filter(
      (c) => c.source.liveStream.liveStreamId === liveStreamId
    )[0];

    res.json(stream.assets);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
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
    const streams = await streamModel
      .find({
        isEnded: false, // Tugallanmagan streamlar
        isStart: false, // Hali jonli bo'lmagan streamlar
      })
      .sort({ planStream: 1 }); // Istalgan tartibda (yaqinroq vaqtlar birinchi)

    if (!streams.length) {
      return res.json({
        error: "Hali boshlanmagan streamlar topilmadi",
      });
    }

    res.json(streams);
  } catch (error) {
    res.json({ error: error.message });
  }
});

router.get("/streams/all", async (req, res) => {
  try {
    const streams = await streamModel.find().sort({ createdAt: -1 });
    res.json(streams);
  } catch (error) {
    res.json({ error: error.message });
  }
});

router.get("/my-streams/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await teacherModel.findById(id);
    if (!teacher) {
      return res.json({ error: "Bunday id ga mos teacher topilmadi" });
    }
    const streams = await streamModel.find();
    const uniqueStreams = streams.filter((c) => c.teacher.id == id);
    const soon = uniqueStreams.filter(
      (c) => c.streamInfo.broadcasting === false
    );
    const live = uniqueStreams.filter((c) => c.streamInfo.broadcasting == true);
    const previous = uniqueStreams.filter((c) => (c.isEnded = true));
    res.json({ soon, live, previous });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
router.get("/streams/previous", verifyToken, async (req, res) => {
  const { userId } = req.user;
  try {
    const streams = await streamModel.find();
    const othersStreams = streams.filter((c) => c.teacher.id !== userId);

    res.json(
      othersStreams
        .sort((a, b) => new Date(b.planStream) - new Date(a.planStream))
        .filter((c) => c.isEnded == true)
    );
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
    const streams = await streamModel.find({ isStart: true });
    res.json(streams.filter((c) => c.isEnded === false));
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

/**
 * @swagger
 * /stream/{id}:
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
router.delete("/stream/:id", authMiddleware, async (req, res) => {
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
