import express from "express";
import streamModel from "../models/stream.model.js";
import axios from "axios";
import authMiddleware from "../middleware/auth.middleware.js";
import { config } from "dotenv";

const router = express.Router();
config();
const apiVideoToken = process.env.API_VIDEO_KEY;

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
      return res.json({ error: "Stream yaratilmadi" });
    }
    const streamSchema = {
      title: req.body.title,
      description: req.body.description ? req.body.description : "",
      classRoom: req.body.classRoom,
      streamInfo: response.data,
      teacher: req.body.teacher,
    };
    if (!streamSchema) {
      return res.json({ error: "Stream yaratishda xatolik ketti" });
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
          date: { $dateToString: { format: "%Y-%m-%d", date: "$planStream" } },
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
router.get("/streams/live", async (req, res) => {
  try {
    const streams = await streamModel.find({ isStart: true });
    res.json({ streams });
  } catch (error) {
    res.json({ error: error.message });
  }
});

router.put("/streams/:id/start", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const stream = await streamModel.findByIdAndUpdate(
      id,
      { isStart: true },
      { new: true }
    );
    if (!stream) {
      return res.json({ error: "Stream ozgartirishda xatolik ketdi" });
    }
    res.json(stream);
  } catch (error) {
    res.json({ error: error.message });
  }
});
router.put("/streams/:id/ended", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if stream exists
    const stream = await streamModel.findById(id);
    if (!stream) {
      return res.status(404).json({ error: "Stream not found" });
    }

    // Update stream and handle success
    const updatedStream = await streamModel.findByIdAndUpdate(
      id,
      {
        isEnded: true,
        isStart: false,
      },
      { new: true }
    ); // Return the updated document

    res.json({ message: "Stream updated successfully", stream: updatedStream });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Error updating stream" });
  }
});

router.post("/streams/:id/viewers", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, userId, profileImage, science } = req.body; // Viewer data

    // Find the stream
    const stream = await streamModel.findById(id);
    if (!stream) {
      return res.status(404).json({ message: "Stream not found" });
    }

    // Check if viewer already exists
    const isViewerExists = stream.viewers.filter(
      (viewer) => viewer.id === userId
    );

    if (isViewerExists) {
      return res.status(409).json({ message: "Viewer already exists" });
    }

    // Update viewers with $push only if viewer doesn't exist
    const updatedStream = await streamModel.findByIdAndUpdate(
      id,
      {
        $push: { viewers: { name, id: userId, profileImage, science } },
      },
      { new: true }
    );

    res.json({ message: "Viewer added successfully", viewer: updatedStream });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error adding viewer" });
  }
});

export default router;
