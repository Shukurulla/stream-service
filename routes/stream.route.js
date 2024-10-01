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
      return res.status(400).json({ message: "Stream yaratilmadi" });
    }

    const findTeacher = await teacherModel.findById(req.body.teacher.id);

    if (!findTeacher) {
      return res.json({ message: "Bunday oqituvchi topilmadi" });
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
  const tests = await streamModel.find();
  // for (let i = 0; i < tests.length; i++) {
  //   await streamModel.findByIdAndDelete(tests[i]._id);
  // }
  res.json(tests.reverse());
});

router.get("/stream/:liveStreamId", async (req, res) => {
  const { liveStreamId } = req.params;
  try {
    const findStream = await streamModel.findOne({ streamId: liveStreamId });
    if (!findStream) {
      return res.status(400).json({ message: "Bunday stream mavjud emas" });
    }

    if (!findStream.isEnded) {
      return res.status(400).json({ message: "Bu stream hali tugallanmagan" });
    }

    const info = await axios.get(`https://ws.api.video/videos`, {
      headers: {
        Authorization: `Bearer ${apiVideoToken}`, // Bu yerda API kalitingizni kiriting
      },
    });

    const { data } = await axios.get(
      `https://ws.api.video/videos?currentPage=1&pageSize=${info.data.pagination.itemsTotal}`,
      {
        headers: {
          Authorization: `Bearer ${apiVideoToken}`, // Bu yerda API kalitingizni kiriting
        },
      }
    );

    const stream = data.data.filter(
      (c) => c.source.liveStream.liveStreamId === liveStreamId
    )[0];

    res.json(stream.assets);
  } catch (error) {
    res.status(error.response?.status || 500).json({ message: error.message });
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
        message: "Hali boshlanmagan streamlar topilmadi",
      });
    }

    res.json(streams);
  } catch (error) {
    res.json({ message: error.message });
  }
});

router.get("/streams/all", async (req, res) => {
  try {
    const streams = await streamModel.find().sort({ createdAt: 1 });
    res.json(streams);
  } catch (error) {
    res.json({ message: error.message });
  }
});

router.get("/my-streams/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await teacherModel.findById(id);
    if (!teacher) {
      return res.json({ message: "Bunday id ga mos teacher topilmadi" });
    }
    const streams = await streamModel.find();
    const uniqueStreams = streams.filter((c) => c.teacher.id == id);
    const soon = uniqueStreams.filter(
      (c) => c.streamInfo.broadcasting === false
    );
    const live = uniqueStreams.filter((c) => c.streamInfo.broadcasting == true);
    const previous = uniqueStreams.filter((c) => (c.isEnded = true));
    res.json({
      soon: soon.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      live: live.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      previous: previous.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      ),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
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
    res.status(500).json({ message: error.message });
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
      return res.status(404).json({ message: "Stream topilmadi" });
    }
    res.json(stream);
  } catch (error) {
    res.status(500).json({ message: error.message });
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
      return res.status(404).json({ message: "Stream topilmadi" });
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
    res.status(500).json({ message: "Streamni yangilashda xato" });
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

const data = [
  {
    videoId: "vi5ATwNG3YAhTyK1aPl7ydZA",
    title: "jj at 2024-09-23 15:51 (UTC)",
    description: "",
    public: true,
    panoramic: false,
    mp4Support: true,
    publishedAt: "2024-09-23T15:51:22+00:00",
    createdAt: "2024-09-23T15:51:22+00:00",
    updatedAt: "2024-09-23T15:51:22+00:00",
    tags: [],
    metadata: [],
    source: {
      type: "live",
      liveStream: {
        liveStreamId: "li6IdN1pRBaHBWNFPitEiffw",
        links: [
          {
            rel: "self",
            uri: "/live-streams/li6IdN1pRBaHBWNFPitEiffw",
          },
        ],
      },
    },
    discarded: false,
    discardedAt: null,
    deletesAt: null,
    assets: {
      iframe:
        '<iframe src="https://embed.api.video/vod/vi5ATwNG3YAhTyK1aPl7ydZA" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen="true"></iframe>',
      player: "https://embed.api.video/vod/vi5ATwNG3YAhTyK1aPl7ydZA",
      hls: "https://vod.api.video/vod/vi5ATwNG3YAhTyK1aPl7ydZA/hls/manifest.m3u8",
      thumbnail:
        "https://vod.api.video/vod/vi5ATwNG3YAhTyK1aPl7ydZA/thumbnail.jpg",
      mp4: "https://vod.api.video/vod/vi5ATwNG3YAhTyK1aPl7ydZA/mp4/source.mp4",
    },
  },
  {
    videoId: "vi5csftjth91gtg34HgN6Jp8",
    title: "Libe at 2024-09-23 16:52 (UTC)",
    description: "",
    public: true,
    panoramic: false,
    mp4Support: true,
    publishedAt: "2024-09-23T16:52:26+00:00",
    createdAt: "2024-09-23T16:52:26+00:00",
    updatedAt: "2024-09-23T16:52:26+00:00",
    tags: [],
    metadata: [],
    source: {
      type: "live",
      liveStream: {
        liveStreamId: "liSAO1w8q2g4gJcx7dOomFf",
        links: [
          {
            rel: "self",
            uri: "/live-streams/liSAO1w8q2g4gJcx7dOomFf",
          },
        ],
      },
    },
    discarded: false,
    discardedAt: null,
    deletesAt: null,
    assets: {
      iframe:
        '<iframe src="https://embed.api.video/vod/vi5csftjth91gtg34HgN6Jp8" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen="true"></iframe>',
      player: "https://embed.api.video/vod/vi5csftjth91gtg34HgN6Jp8",
      hls: "https://vod.api.video/vod/vi5csftjth91gtg34HgN6Jp8/hls/manifest.m3u8",
      thumbnail:
        "https://vod.api.video/vod/vi5csftjth91gtg34HgN6Jp8/thumbnail.jpg",
      mp4: "https://vod.api.video/vod/vi5csftjth91gtg34HgN6Jp8/mp4/source.mp4",
    },
  },
  {
    videoId: "vi4zoe4JirDgMNKZnAfhV539",
    title: "jl at 2024-09-23 17:40 (UTC)",
    description: "",
    public: true,
    panoramic: false,
    mp4Support: true,
    publishedAt: "2024-09-23T17:40:10+00:00",
    createdAt: "2024-09-23T17:40:10+00:00",
    updatedAt: "2024-09-23T17:40:10+00:00",
    tags: [],
    metadata: [],
    source: {
      type: "live",
      liveStream: {
        liveStreamId: "lit9xvu9FstCpoAl713w4eG",
        links: [
          {
            rel: "self",
            uri: "/live-streams/lit9xvu9FstCpoAl713w4eG",
          },
        ],
      },
    },
    discarded: false,
    discardedAt: null,
    deletesAt: null,
    assets: {
      iframe:
        '<iframe src="https://embed.api.video/vod/vi4zoe4JirDgMNKZnAfhV539" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen="true"></iframe>',
      player: "https://embed.api.video/vod/vi4zoe4JirDgMNKZnAfhV539",
      hls: "https://vod.api.video/vod/vi4zoe4JirDgMNKZnAfhV539/hls/manifest.m3u8",
      thumbnail:
        "https://vod.api.video/vod/vi4zoe4JirDgMNKZnAfhV539/thumbnail.jpg",
      mp4: "https://vod.api.video/vod/vi4zoe4JirDgMNKZnAfhV539/mp4/source.mp4",
    },
  },
  {
    videoId: "vi2syQxvDyNWZVzuxJKPMAg5",
    title: "Asadbek Qogambaev temasi at 2024-09-23 18:03 (UTC)",
    description: "",
    public: true,
    panoramic: false,
    mp4Support: true,
    publishedAt: "2024-09-23T18:03:35+00:00",
    createdAt: "2024-09-23T18:03:35+00:00",
    updatedAt: "2024-09-23T18:03:35+00:00",
    tags: [],
    metadata: [],
    source: {
      type: "live",
      liveStream: {
        liveStreamId: "li5opBPZsc3aLTYMjfEiao2Y",
        links: [
          {
            rel: "self",
            uri: "/live-streams/li5opBPZsc3aLTYMjfEiao2Y",
          },
        ],
      },
    },
    discarded: false,
    discardedAt: null,
    deletesAt: null,
    assets: {
      iframe:
        '<iframe src="https://embed.api.video/vod/vi2syQxvDyNWZVzuxJKPMAg5" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen="true"></iframe>',
      player: "https://embed.api.video/vod/vi2syQxvDyNWZVzuxJKPMAg5",
      hls: "https://vod.api.video/vod/vi2syQxvDyNWZVzuxJKPMAg5/hls/manifest.m3u8",
      thumbnail:
        "https://vod.api.video/vod/vi2syQxvDyNWZVzuxJKPMAg5/thumbnail.jpg",
      mp4: "https://vod.api.video/vod/vi2syQxvDyNWZVzuxJKPMAg5/mp4/source.mp4",
    },
  },
  {
    videoId: "vi3miybfmavTFMliVu96NbSj",
    title: "for test at 2024-09-23 18:05 (UTC)",
    description: "",
    public: true,
    panoramic: false,
    mp4Support: true,
    publishedAt: "2024-09-23T18:05:15+00:00",
    createdAt: "2024-09-23T18:05:15+00:00",
    updatedAt: "2024-09-23T18:05:15+00:00",
    tags: [],
    metadata: [],
    source: {
      type: "live",
      liveStream: {
        liveStreamId: "licJdEdu50BfkDI5xzq3DN7",
        links: [
          {
            rel: "self",
            uri: "/live-streams/licJdEdu50BfkDI5xzq3DN7",
          },
        ],
      },
    },
    discarded: false,
    discardedAt: null,
    deletesAt: null,
    assets: {
      iframe:
        '<iframe src="https://embed.api.video/vod/vi3miybfmavTFMliVu96NbSj" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen="true"></iframe>',
      player: "https://embed.api.video/vod/vi3miybfmavTFMliVu96NbSj",
      hls: "https://vod.api.video/vod/vi3miybfmavTFMliVu96NbSj/hls/manifest.m3u8",
      thumbnail:
        "https://vod.api.video/vod/vi3miybfmavTFMliVu96NbSj/thumbnail.jpg",
      mp4: "https://vod.api.video/vod/vi3miybfmavTFMliVu96NbSj/mp4/source.mp4",
    },
  },
  {
    videoId: "vi6AgBA2ubqapM7RhJAUIiUc",
    title: "2662 at 2024-09-24 09:37 (UTC)",
    description: "",
    public: true,
    panoramic: false,
    mp4Support: true,
    publishedAt: "2024-09-24T09:37:30+00:00",
    createdAt: "2024-09-24T09:37:30+00:00",
    updatedAt: "2024-09-24T09:37:30+00:00",
    tags: [],
    metadata: [],
    source: {
      type: "live",
      liveStream: {
        liveStreamId: "li2SXGBMDJSsl0VexVDC4MMr",
        links: [
          {
            rel: "self",
            uri: "/live-streams/li2SXGBMDJSsl0VexVDC4MMr",
          },
        ],
      },
    },
    discarded: false,
    discardedAt: null,
    deletesAt: null,
    assets: {
      iframe:
        '<iframe src="https://embed.api.video/vod/vi6AgBA2ubqapM7RhJAUIiUc" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen="true"></iframe>',
      player: "https://embed.api.video/vod/vi6AgBA2ubqapM7RhJAUIiUc",
      hls: "https://vod.api.video/vod/vi6AgBA2ubqapM7RhJAUIiUc/hls/manifest.m3u8",
      thumbnail:
        "https://vod.api.video/vod/vi6AgBA2ubqapM7RhJAUIiUc/thumbnail.jpg",
      mp4: "https://vod.api.video/vod/vi6AgBA2ubqapM7RhJAUIiUc/mp4/source.mp4",
    },
  },
  {
    videoId: "vi1ffNpeXDzG7OpSiauCAcOc",
    title: "amir111 at 2024-09-24 09:40 (UTC)",
    description: "",
    public: true,
    panoramic: false,
    mp4Support: true,
    publishedAt: "2024-09-24T09:40:57+00:00",
    createdAt: "2024-09-24T09:40:57+00:00",
    updatedAt: "2024-09-24T09:40:57+00:00",
    tags: [],
    metadata: [],
    source: {
      type: "live",
      liveStream: {
        liveStreamId: "li5IX7Aq480SFjm9PWTlYSqa",
        links: [
          {
            rel: "self",
            uri: "/live-streams/li5IX7Aq480SFjm9PWTlYSqa",
          },
        ],
      },
    },
    discarded: false,
    discardedAt: null,
    deletesAt: null,
    assets: {
      iframe:
        '<iframe src="https://embed.api.video/vod/vi1ffNpeXDzG7OpSiauCAcOc" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen="true"></iframe>',
      player: "https://embed.api.video/vod/vi1ffNpeXDzG7OpSiauCAcOc",
      hls: "https://vod.api.video/vod/vi1ffNpeXDzG7OpSiauCAcOc/hls/manifest.m3u8",
      thumbnail:
        "https://vod.api.video/vod/vi1ffNpeXDzG7OpSiauCAcOc/thumbnail.jpg",
      mp4: "https://vod.api.video/vod/vi1ffNpeXDzG7OpSiauCAcOc/mp4/source.mp4",
    },
  },
  {
    videoId: "vi29XBqIL6hDubG3Wq8JaTxD",
    title: "жиа at 2024-09-26 11:57 (UTC)",
    description: "",
    public: true,
    panoramic: false,
    mp4Support: true,
    publishedAt: "2024-09-26T11:57:47+00:00",
    createdAt: "2024-09-26T11:57:47+00:00",
    updatedAt: "2024-09-26T11:57:47+00:00",
    tags: [],
    metadata: [],
    source: {
      type: "live",
      liveStream: {
        liveStreamId: "li3rRzkxHri7qgUGHgOhDldw",
        links: [
          {
            rel: "self",
            uri: "/live-streams/li3rRzkxHri7qgUGHgOhDldw",
          },
        ],
      },
    },
    discarded: false,
    discardedAt: null,
    deletesAt: null,
    assets: {
      iframe:
        '<iframe src="https://embed.api.video/vod/vi29XBqIL6hDubG3Wq8JaTxD" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen="true"></iframe>',
      player: "https://embed.api.video/vod/vi29XBqIL6hDubG3Wq8JaTxD",
      hls: "https://vod.api.video/vod/vi29XBqIL6hDubG3Wq8JaTxD/hls/manifest.m3u8",
      thumbnail:
        "https://vod.api.video/vod/vi29XBqIL6hDubG3Wq8JaTxD/thumbnail.jpg",
      mp4: "https://vod.api.video/vod/vi29XBqIL6hDubG3Wq8JaTxD/mp4/source.mp4",
    },
  },
  {
    videoId: "vi26qh0r4vXZm0XDXaWZpEBi",
    title: "live at 2024-09-26 12:11 (UTC)",
    description: "",
    public: true,
    panoramic: false,
    mp4Support: true,
    publishedAt: "2024-09-26T12:11:21+00:00",
    createdAt: "2024-09-26T12:11:21+00:00",
    updatedAt: "2024-09-26T12:11:21+00:00",
    tags: [],
    metadata: [],
    source: {
      type: "live",
      liveStream: {
        liveStreamId: "li59P3gUjAR4o3cWlB1wj24l",
        links: [
          {
            rel: "self",
            uri: "/live-streams/li59P3gUjAR4o3cWlB1wj24l",
          },
        ],
      },
    },
    discarded: false,
    discardedAt: null,
    deletesAt: null,
    assets: {
      iframe:
        '<iframe src="https://embed.api.video/vod/vi26qh0r4vXZm0XDXaWZpEBi" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen="true"></iframe>',
      player: "https://embed.api.video/vod/vi26qh0r4vXZm0XDXaWZpEBi",
      hls: "https://vod.api.video/vod/vi26qh0r4vXZm0XDXaWZpEBi/hls/manifest.m3u8",
      thumbnail:
        "https://vod.api.video/vod/vi26qh0r4vXZm0XDXaWZpEBi/thumbnail.jpg",
      mp4: "https://vod.api.video/vod/vi26qh0r4vXZm0XDXaWZpEBi/mp4/source.mp4",
    },
  },
  {
    videoId: "vi5OOYmxjSvBjhvxHdMnWSgb",
    title: "hh at 2024-09-26 12:23 (UTC)",
    description: "",
    public: true,
    panoramic: false,
    mp4Support: true,
    publishedAt: "2024-09-26T12:23:46+00:00",
    createdAt: "2024-09-26T12:23:46+00:00",
    updatedAt: "2024-09-26T12:23:46+00:00",
    tags: [],
    metadata: [],
    source: {
      type: "live",
      liveStream: {
        liveStreamId: "li3E2TYCbw5Nug64xiNeFSQz",
        links: [
          {
            rel: "self",
            uri: "/live-streams/li3E2TYCbw5Nug64xiNeFSQz",
          },
        ],
      },
    },
    discarded: false,
    discardedAt: null,
    deletesAt: null,
    assets: {
      iframe:
        '<iframe src="https://embed.api.video/vod/vi5OOYmxjSvBjhvxHdMnWSgb" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen="true"></iframe>',
      player: "https://embed.api.video/vod/vi5OOYmxjSvBjhvxHdMnWSgb",
      hls: "https://vod.api.video/vod/vi5OOYmxjSvBjhvxHdMnWSgb/hls/manifest.m3u8",
      thumbnail:
        "https://vod.api.video/vod/vi5OOYmxjSvBjhvxHdMnWSgb/thumbnail.jpg",
      mp4: "https://vod.api.video/vod/vi5OOYmxjSvBjhvxHdMnWSgb/mp4/source.mp4",
    },
  },
  {
    videoId: "vi4PoYAyxJmN8O7vTs4jDYlH",
    title: "Translation  at 2024-09-26 12:33 (UTC)",
    description: "",
    public: true,
    panoramic: false,
    mp4Support: true,
    publishedAt: "2024-09-26T12:33:07+00:00",
    createdAt: "2024-09-26T12:33:07+00:00",
    updatedAt: "2024-09-26T12:33:07+00:00",
    tags: [],
    metadata: [],
    source: {
      type: "live",
      liveStream: {
        liveStreamId: "li2GrAMqTfSDMN2vYvXh8U6B",
        links: [
          {
            rel: "self",
            uri: "/live-streams/li2GrAMqTfSDMN2vYvXh8U6B",
          },
        ],
      },
    },
    discarded: false,
    discardedAt: null,
    deletesAt: null,
    assets: {
      iframe:
        '<iframe src="https://embed.api.video/vod/vi4PoYAyxJmN8O7vTs4jDYlH" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen="true"></iframe>',
      player: "https://embed.api.video/vod/vi4PoYAyxJmN8O7vTs4jDYlH",
      hls: "https://vod.api.video/vod/vi4PoYAyxJmN8O7vTs4jDYlH/hls/manifest.m3u8",
      thumbnail:
        "https://vod.api.video/vod/vi4PoYAyxJmN8O7vTs4jDYlH/thumbnail.jpg",
      mp4: "https://vod.api.video/vod/vi4PoYAyxJmN8O7vTs4jDYlH/mp4/source.mp4",
    },
  },
  {
    videoId: "viIWef1G80zjOg1kFCK9wyM",
    title: "L at 2024-09-26 12:43 (UTC)",
    description: "",
    public: true,
    panoramic: false,
    mp4Support: true,
    publishedAt: "2024-09-26T12:43:48+00:00",
    createdAt: "2024-09-26T12:43:48+00:00",
    updatedAt: "2024-09-26T12:43:48+00:00",
    tags: [],
    metadata: [],
    source: {
      type: "live",
      liveStream: {
        liveStreamId: "li3f7USa9A7x8gJoggt94QgH",
        links: [
          {
            rel: "self",
            uri: "/live-streams/li3f7USa9A7x8gJoggt94QgH",
          },
        ],
      },
    },
    discarded: false,
    discardedAt: null,
    deletesAt: null,
    assets: {
      iframe:
        '<iframe src="https://embed.api.video/vod/viIWef1G80zjOg1kFCK9wyM" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen="true"></iframe>',
      player: "https://embed.api.video/vod/viIWef1G80zjOg1kFCK9wyM",
      hls: "https://vod.api.video/vod/viIWef1G80zjOg1kFCK9wyM/hls/manifest.m3u8",
      thumbnail:
        "https://vod.api.video/vod/viIWef1G80zjOg1kFCK9wyM/thumbnail.jpg",
      mp4: "https://vod.api.video/vod/viIWef1G80zjOg1kFCK9wyM/mp4/source.mp4",
    },
  },
  {
    videoId: "vi2gW016NFEpFvRJ7Rn2fBRQ",
    title: "h at 2024-09-26 12:59 (UTC)",
    description: "",
    public: true,
    panoramic: false,
    mp4Support: true,
    publishedAt: "2024-09-26T12:59:10+00:00",
    createdAt: "2024-09-26T12:59:10+00:00",
    updatedAt: "2024-09-26T12:59:10+00:00",
    tags: [],
    metadata: [],
    source: {
      type: "live",
      liveStream: {
        liveStreamId: "li64mSGIiBHRtYOw9hXtlS7U",
        links: [
          {
            rel: "self",
            uri: "/live-streams/li64mSGIiBHRtYOw9hXtlS7U",
          },
        ],
      },
    },
    discarded: false,
    discardedAt: null,
    deletesAt: null,
    assets: {
      iframe:
        '<iframe src="https://embed.api.video/vod/vi2gW016NFEpFvRJ7Rn2fBRQ" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen="true"></iframe>',
      player: "https://embed.api.video/vod/vi2gW016NFEpFvRJ7Rn2fBRQ",
      hls: "https://vod.api.video/vod/vi2gW016NFEpFvRJ7Rn2fBRQ/hls/manifest.m3u8",
      thumbnail:
        "https://vod.api.video/vod/vi2gW016NFEpFvRJ7Rn2fBRQ/thumbnail.jpg",
      mp4: "https://vod.api.video/vod/vi2gW016NFEpFvRJ7Rn2fBRQ/mp4/source.mp4",
    },
  },
  {
    videoId: "vi1RnYQpksp1U9SyVsq0O6zw",
    title: "dndn at 2024-09-26 13:04 (UTC)",
    description: "",
    public: true,
    panoramic: false,
    mp4Support: true,
    publishedAt: "2024-09-26T13:04:30+00:00",
    createdAt: "2024-09-26T13:04:30+00:00",
    updatedAt: "2024-09-26T13:04:30+00:00",
    tags: [],
    metadata: [],
    source: {
      type: "live",
      liveStream: {
        liveStreamId: "li3rpEdCIJejivxe62Mvwo97",
        links: [
          {
            rel: "self",
            uri: "/live-streams/li3rpEdCIJejivxe62Mvwo97",
          },
        ],
      },
    },
    discarded: false,
    discardedAt: null,
    deletesAt: null,
    assets: {
      iframe:
        '<iframe src="https://embed.api.video/vod/vi1RnYQpksp1U9SyVsq0O6zw" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen="true"></iframe>',
      player: "https://embed.api.video/vod/vi1RnYQpksp1U9SyVsq0O6zw",
      hls: "https://vod.api.video/vod/vi1RnYQpksp1U9SyVsq0O6zw/hls/manifest.m3u8",
      thumbnail:
        "https://vod.api.video/vod/vi1RnYQpksp1U9SyVsq0O6zw/thumbnail.jpg",
      mp4: "https://vod.api.video/vod/vi1RnYQpksp1U9SyVsq0O6zw/mp4/source.mp4",
    },
  },
  {
    videoId: "vi7XCJC1yaZYgJNaWOhHVZpi",
    title: "khin at 2024-09-26 13:07 (UTC)",
    description: "",
    public: true,
    panoramic: false,
    mp4Support: true,
    publishedAt: "2024-09-26T13:07:40+00:00",
    createdAt: "2024-09-26T13:07:40+00:00",
    updatedAt: "2024-09-26T13:07:40+00:00",
    tags: [],
    metadata: [],
    source: {
      type: "live",
      liveStream: {
        liveStreamId: "li6SDn6ZVA5N5gP2rzBTWqqD",
        links: [
          {
            rel: "self",
            uri: "/live-streams/li6SDn6ZVA5N5gP2rzBTWqqD",
          },
        ],
      },
    },
    discarded: false,
    discardedAt: null,
    deletesAt: null,
    assets: {
      iframe:
        '<iframe src="https://embed.api.video/vod/vi7XCJC1yaZYgJNaWOhHVZpi" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen="true"></iframe>',
      player: "https://embed.api.video/vod/vi7XCJC1yaZYgJNaWOhHVZpi",
      hls: "https://vod.api.video/vod/vi7XCJC1yaZYgJNaWOhHVZpi/hls/manifest.m3u8",
      thumbnail:
        "https://vod.api.video/vod/vi7XCJC1yaZYgJNaWOhHVZpi/thumbnail.jpg",
      mp4: "https://vod.api.video/vod/vi7XCJC1yaZYgJNaWOhHVZpi/mp4/source.mp4",
    },
  },
  {
    videoId: "vi4efP6bHZV1F9nnjyOJJtev",
    title: "t at 2024-09-26 13:14 (UTC)",
    description: "",
    public: true,
    panoramic: false,
    mp4Support: true,
    publishedAt: "2024-09-26T13:14:28+00:00",
    createdAt: "2024-09-26T13:14:28+00:00",
    updatedAt: "2024-09-26T13:14:28+00:00",
    tags: [],
    metadata: [],
    source: {
      type: "live",
      liveStream: {
        liveStreamId: "li1obJYbaIDTWRW806057ggU",
        links: [
          {
            rel: "self",
            uri: "/live-streams/li1obJYbaIDTWRW806057ggU",
          },
        ],
      },
    },
    discarded: false,
    discardedAt: null,
    deletesAt: null,
    assets: {
      iframe:
        '<iframe src="https://embed.api.video/vod/vi4efP6bHZV1F9nnjyOJJtev" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen="true"></iframe>',
      player: "https://embed.api.video/vod/vi4efP6bHZV1F9nnjyOJJtev",
      hls: "https://vod.api.video/vod/vi4efP6bHZV1F9nnjyOJJtev/hls/manifest.m3u8",
      thumbnail:
        "https://vod.api.video/vod/vi4efP6bHZV1F9nnjyOJJtev/thumbnail.jpg",
      mp4: "https://vod.api.video/vod/vi4efP6bHZV1F9nnjyOJJtev/mp4/source.mp4",
    },
  },
  {
    videoId: "vi5pofvpa88oyyi3AQS5J1Y3",
    title: "mn at 2024-09-26 13:20 (UTC)",
    description: "",
    public: true,
    panoramic: false,
    mp4Support: true,
    publishedAt: "2024-09-26T13:20:47+00:00",
    createdAt: "2024-09-26T13:20:47+00:00",
    updatedAt: "2024-09-26T13:20:47+00:00",
    tags: [],
    metadata: [],
    source: {
      type: "live",
      liveStream: {
        liveStreamId: "li1T4j4yLPE6q9wAfgoZrurl",
        links: [
          {
            rel: "self",
            uri: "/live-streams/li1T4j4yLPE6q9wAfgoZrurl",
          },
        ],
      },
    },
    discarded: false,
    discardedAt: null,
    deletesAt: null,
    assets: {
      iframe:
        '<iframe src="https://embed.api.video/vod/vi5pofvpa88oyyi3AQS5J1Y3" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen="true"></iframe>',
      player: "https://embed.api.video/vod/vi5pofvpa88oyyi3AQS5J1Y3",
      hls: "https://vod.api.video/vod/vi5pofvpa88oyyi3AQS5J1Y3/hls/manifest.m3u8",
      thumbnail:
        "https://vod.api.video/vod/vi5pofvpa88oyyi3AQS5J1Y3/thumbnail.jpg",
      mp4: "https://vod.api.video/vod/vi5pofvpa88oyyi3AQS5J1Y3/mp4/source.mp4",
    },
  },
  {
    videoId: "vi4drJSjVCp6xH4JT8tnv09R",
    title: "kk at 2024-09-27 11:52 (UTC)",
    description: "",
    public: true,
    panoramic: false,
    mp4Support: true,
    publishedAt: "2024-09-27T11:52:33+00:00",
    createdAt: "2024-09-27T11:52:33+00:00",
    updatedAt: "2024-09-27T11:52:33+00:00",
    tags: [],
    metadata: [],
    source: {
      type: "live",
      liveStream: {
        liveStreamId: "li6f2j3TXIVklnGMcPIn9HOG",
        links: [
          {
            rel: "self",
            uri: "/live-streams/li6f2j3TXIVklnGMcPIn9HOG",
          },
        ],
      },
    },
    discarded: false,
    discardedAt: null,
    deletesAt: null,
    assets: {
      iframe:
        '<iframe src="https://embed.api.video/vod/vi4drJSjVCp6xH4JT8tnv09R" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen="true"></iframe>',
      player: "https://embed.api.video/vod/vi4drJSjVCp6xH4JT8tnv09R",
      hls: "https://vod.api.video/vod/vi4drJSjVCp6xH4JT8tnv09R/hls/manifest.m3u8",
      thumbnail:
        "https://vod.api.video/vod/vi4drJSjVCp6xH4JT8tnv09R/thumbnail.jpg",
      mp4: "https://vod.api.video/vod/vi4drJSjVCp6xH4JT8tnv09R/mp4/source.mp4",
    },
  },
  {
    videoId: "vi1wccxWoPsO1LMnIF8u7LLf",
    title: "fff at 2024-09-27 11:55 (UTC)",
    description: "",
    public: true,
    panoramic: false,
    mp4Support: true,
    publishedAt: "2024-09-27T11:55:47+00:00",
    createdAt: "2024-09-27T11:55:47+00:00",
    updatedAt: "2024-09-27T11:55:47+00:00",
    tags: [],
    metadata: [],
    source: {
      type: "live",
      liveStream: {
        liveStreamId: "li2EiTSOzbmCrGUcRqwCDuUZ",
        links: [
          {
            rel: "self",
            uri: "/live-streams/li2EiTSOzbmCrGUcRqwCDuUZ",
          },
        ],
      },
    },
    discarded: false,
    discardedAt: null,
    deletesAt: null,
    assets: {
      iframe:
        '<iframe src="https://embed.api.video/vod/vi1wccxWoPsO1LMnIF8u7LLf" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen="true"></iframe>',
      player: "https://embed.api.video/vod/vi1wccxWoPsO1LMnIF8u7LLf",
      hls: "https://vod.api.video/vod/vi1wccxWoPsO1LMnIF8u7LLf/hls/manifest.m3u8",
      thumbnail:
        "https://vod.api.video/vod/vi1wccxWoPsO1LMnIF8u7LLf/thumbnail.jpg",
      mp4: "https://vod.api.video/vod/vi1wccxWoPsO1LMnIF8u7LLf/mp4/source.mp4",
    },
  },
  {
    videoId: "vi1E7hzgosvF4TlCmy4Z7YCn",
    title: "ee at 2024-09-27 11:59 (UTC)",
    description: "",
    public: true,
    panoramic: false,
    mp4Support: true,
    publishedAt: "2024-09-27T11:59:36+00:00",
    createdAt: "2024-09-27T11:59:36+00:00",
    updatedAt: "2024-09-27T11:59:36+00:00",
    tags: [],
    metadata: [],
    source: {
      type: "live",
      liveStream: {
        liveStreamId: "li26l4UXbTAAvhOP35G9UzWR",
        links: [
          {
            rel: "self",
            uri: "/live-streams/li26l4UXbTAAvhOP35G9UzWR",
          },
        ],
      },
    },
    discarded: false,
    discardedAt: null,
    deletesAt: null,
    assets: {
      iframe:
        '<iframe src="https://embed.api.video/vod/vi1E7hzgosvF4TlCmy4Z7YCn" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen="true"></iframe>',
      player: "https://embed.api.video/vod/vi1E7hzgosvF4TlCmy4Z7YCn",
      hls: "https://vod.api.video/vod/vi1E7hzgosvF4TlCmy4Z7YCn/hls/manifest.m3u8",
      thumbnail:
        "https://vod.api.video/vod/vi1E7hzgosvF4TlCmy4Z7YCn/thumbnail.jpg",
      mp4: "https://vod.api.video/vod/vi1E7hzgosvF4TlCmy4Z7YCn/mp4/source.mp4",
    },
  },
  {
    videoId: "vi4Rj5k78HfUvaKKeB6SUdM4",
    title: "rr at 2024-09-27 12:02 (UTC)",
    description: "",
    public: true,
    panoramic: false,
    mp4Support: true,
    publishedAt: "2024-09-27T12:02:43+00:00",
    createdAt: "2024-09-27T12:02:43+00:00",
    updatedAt: "2024-09-27T12:02:43+00:00",
    tags: [],
    metadata: [],
    source: {
      type: "live",
      liveStream: {
        liveStreamId: "li6KhMheQPXrRrGBdO19icKM",
        links: [
          {
            rel: "self",
            uri: "/live-streams/li6KhMheQPXrRrGBdO19icKM",
          },
        ],
      },
    },
    discarded: false,
    discardedAt: null,
    deletesAt: null,
    assets: {
      iframe:
        '<iframe src="https://embed.api.video/vod/vi4Rj5k78HfUvaKKeB6SUdM4" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen="true"></iframe>',
      player: "https://embed.api.video/vod/vi4Rj5k78HfUvaKKeB6SUdM4",
      hls: "https://vod.api.video/vod/vi4Rj5k78HfUvaKKeB6SUdM4/hls/manifest.m3u8",
      thumbnail:
        "https://vod.api.video/vod/vi4Rj5k78HfUvaKKeB6SUdM4/thumbnail.jpg",
      mp4: "https://vod.api.video/vod/vi4Rj5k78HfUvaKKeB6SUdM4/mp4/source.mp4",
    },
  },
  {
    videoId: "viqjx64M5TMeTf2k9sAVLw6",
    title: "33 at 2024-09-27 12:04 (UTC)",
    description: "",
    public: true,
    panoramic: false,
    mp4Support: true,
    publishedAt: "2024-09-27T12:04:21+00:00",
    createdAt: "2024-09-27T12:04:21+00:00",
    updatedAt: "2024-09-27T12:04:21+00:00",
    tags: [],
    metadata: [],
    source: {
      type: "live",
      liveStream: {
        liveStreamId: "li6sE9nvV0cIub9GmWujGmLu",
        links: [
          {
            rel: "self",
            uri: "/live-streams/li6sE9nvV0cIub9GmWujGmLu",
          },
        ],
      },
    },
    discarded: false,
    discardedAt: null,
    deletesAt: null,
    assets: {
      iframe:
        '<iframe src="https://embed.api.video/vod/viqjx64M5TMeTf2k9sAVLw6" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen="true"></iframe>',
      player: "https://embed.api.video/vod/viqjx64M5TMeTf2k9sAVLw6",
      hls: "https://vod.api.video/vod/viqjx64M5TMeTf2k9sAVLw6/hls/manifest.m3u8",
      thumbnail:
        "https://vod.api.video/vod/viqjx64M5TMeTf2k9sAVLw6/thumbnail.jpg",
      mp4: "https://vod.api.video/vod/viqjx64M5TMeTf2k9sAVLw6/mp4/source.mp4",
    },
  },
  {
    videoId: "vi1FMBZTj4f2L2cqwSrzdDyv",
    title: "hh at 2024-09-27 12:33 (UTC)",
    description: "",
    public: true,
    panoramic: false,
    mp4Support: true,
    publishedAt: "2024-09-27T12:33:28+00:00",
    createdAt: "2024-09-27T12:33:28+00:00",
    updatedAt: "2024-09-27T12:33:28+00:00",
    tags: [],
    metadata: [],
    source: {
      type: "live",
      liveStream: {
        liveStreamId: "li6o3KwTf3CY7E9k73TBerNJ",
        links: [
          {
            rel: "self",
            uri: "/live-streams/li6o3KwTf3CY7E9k73TBerNJ",
          },
        ],
      },
    },
    discarded: false,
    discardedAt: null,
    deletesAt: null,
    assets: {
      iframe:
        '<iframe src="https://embed.api.video/vod/vi1FMBZTj4f2L2cqwSrzdDyv" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen="true"></iframe>',
      player: "https://embed.api.video/vod/vi1FMBZTj4f2L2cqwSrzdDyv",
      hls: "https://vod.api.video/vod/vi1FMBZTj4f2L2cqwSrzdDyv/hls/manifest.m3u8",
      thumbnail:
        "https://vod.api.video/vod/vi1FMBZTj4f2L2cqwSrzdDyv/thumbnail.jpg",
      mp4: "https://vod.api.video/vod/vi1FMBZTj4f2L2cqwSrzdDyv/mp4/source.mp4",
    },
  },
  {
    videoId: "viwo6fsey9duoATOKJVeLji",
    title: "Амир at 2024-09-27 12:38 (UTC)",
    description: "",
    public: true,
    panoramic: false,
    mp4Support: true,
    publishedAt: "2024-09-27T12:38:13+00:00",
    createdAt: "2024-09-27T12:38:13+00:00",
    updatedAt: "2024-09-27T12:38:13+00:00",
    tags: [],
    metadata: [],
    source: {
      type: "live",
      liveStream: {
        liveStreamId: "li11d8UosaJN9JZyIbgeUWqU",
        links: [
          {
            rel: "self",
            uri: "/live-streams/li11d8UosaJN9JZyIbgeUWqU",
          },
        ],
      },
    },
    discarded: false,
    discardedAt: null,
    deletesAt: null,
    assets: {
      iframe:
        '<iframe src="https://embed.api.video/vod/viwo6fsey9duoATOKJVeLji" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen="true"></iframe>',
      player: "https://embed.api.video/vod/viwo6fsey9duoATOKJVeLji",
      hls: "https://vod.api.video/vod/viwo6fsey9duoATOKJVeLji/hls/manifest.m3u8",
      thumbnail:
        "https://vod.api.video/vod/viwo6fsey9duoATOKJVeLji/thumbnail.jpg",
      mp4: "https://vod.api.video/vod/viwo6fsey9duoATOKJVeLji/mp4/source.mp4",
    },
  },
  {
    videoId: "vi5sEHIW1TlQDl01f5jmnUyK",
    title: "Амир at 2024-09-27 12:40 (UTC)",
    description: "",
    public: true,
    panoramic: false,
    mp4Support: true,
    publishedAt: "2024-09-27T12:40:05+00:00",
    createdAt: "2024-09-27T12:40:05+00:00",
    updatedAt: "2024-09-27T12:40:05+00:00",
    tags: [],
    metadata: [],
    source: {
      type: "live",
      liveStream: {
        liveStreamId: "li6KMXifNSTaldMyn23mUOxO",
        links: [
          {
            rel: "self",
            uri: "/live-streams/li6KMXifNSTaldMyn23mUOxO",
          },
        ],
      },
    },
    discarded: false,
    discardedAt: null,
    deletesAt: null,
    assets: {
      iframe:
        '<iframe src="https://embed.api.video/vod/vi5sEHIW1TlQDl01f5jmnUyK" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen="true"></iframe>',
      player: "https://embed.api.video/vod/vi5sEHIW1TlQDl01f5jmnUyK",
      hls: "https://vod.api.video/vod/vi5sEHIW1TlQDl01f5jmnUyK/hls/manifest.m3u8",
      thumbnail:
        "https://vod.api.video/vod/vi5sEHIW1TlQDl01f5jmnUyK/thumbnail.jpg",
      mp4: "https://vod.api.video/vod/vi5sEHIW1TlQDl01f5jmnUyK/mp4/source.mp4",
    },
  },
];

console.log(data.length);
