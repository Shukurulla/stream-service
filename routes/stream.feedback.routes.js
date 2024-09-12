import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import streamModel from "../models/stream.model.js";

const router = express.Router();

// Rating va Comment qo'shish route
router.post("/stream/:id/feedback", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params; // Stream ID
    const {
      userId,
      userName,
      commentText,
      teacherName,
      profileImage,
      science,
      rate,
      feedback,
    } = req.body;

    // Streamni topish
    const stream = await streamModel.findById(id);
    if (!stream) {
      return res.status(404).json({ message: "Stream topilmadi" });
    }

    // Comment qo'shish
    if (commentText) {
      const newComment = {
        user: {
          id: userId,
          name: userName,
        },
        comment: commentText,
        date: new Date(),
      };
      stream.comments.push(newComment);
    }

    // Rating qo'shish
    if (rate) {
      const newRating = {
        teacher: {
          name: teacherName,
          profileImage: profileImage,
          science: science,
        },
        rate: rate,
        feedback: feedback,
        date: new Date(),
        read: false,
      };

      stream.rating.ratings.push(newRating);

      // Umumiy reytingni yangilash
      const totalRatings = stream.rating.ratings.length;
      const sumRatings = stream.rating.ratings.reduce(
        (sum, r) => sum + r.rate,
        0
      );
      stream.rating.totalRating = sumRatings / totalRatings;
    }

    // O'zgarishlarni saqlash
    await stream.save();

    res
      .status(200)
      .json({ message: "Comment va rating muvaffaqiyatli qo'shildi", stream });
  } catch (error) {
    res.status(500).json({ message: "Server xatosi", error });
  }
});
router.get("/stream/:id/feedbacks", async (req, res) => {
  try {
    const { id } = req.params; // Stream ID

    // Streamni topish
    const stream = await streamModel.findById(id);
    if (!stream) {
      return res.status(404).json({ message: "Stream topilmadi" });
    }

    // Barcha feedbacklarni olish
    const feedbacks = stream.rating.ratings;

    if (feedbacks.length === 0) {
      return res
        .status(200)
        .json({ message: "Hech qanday feedback topilmadi", averageRating: 0 });
    }

    // Umumiy reytingni hisoblash
    const totalRatings = feedbacks.length;
    const sumRatings = feedbacks.reduce(
      (sum, feedback) => sum + feedback.rate,
      0
    );
    const averageRating = sumRatings / totalRatings;

    res.status(200).json({
      message: "Feedbacklar muvaffaqiyatli olindi",
      feedbacks: feedbacks,
      averageRating: averageRating,
    });
  } catch (error) {
    res.status(500).json({ message: "Server xatosi", error });
  }
});

// Barcha feedbacklarni read sifatida belgilash uchun route
router.put("/streams/:streamId/read", authMiddleware, async (req, res) => {
  const { streamId } = req.params;

  try {
    // Streamni topish
    const stream = await streamModel.findById(streamId);
    if (!stream) {
      return res.status(404).json({ message: "Stream not found" });
    }

    // Barcha feedbacklarni read sifatida belgilash
    const updatedStream = await streamModel.findByIdAndUpdate(
      streamId,
      {
        $set: {
          "rating.ratings.$[elem].read": true,
        },
      },
      {
        arrayFilters: [{ "elem.read": false }],
        new: true,
      }
    );

    res.status(200).json({
      message: "All feedbacks marked as read",
      data: updatedStream,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Failed to update feedbacks", error: error.message });
  }
});
export default router;
