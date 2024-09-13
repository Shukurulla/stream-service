import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema({
  teacher: {
    name: { type: String, required: true },
    profileImage: { type: String, required: true },
    science: { type: String, required: true },
  },
  rate: { type: Number, min: 1, max: 5, required: true },
  feedback: { type: String },
  date: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
});

const commentSchema = new mongoose.Schema({
  user: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
  },
  comment: { type: String, required: true },
  date: { type: Date, default: Date.now },
});

const streamSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  planStream: {
    type: Date, // Streamingni rejalashtirish uchun sana va vaqt
    default: new Date(),
  },
  classRoom: {
    type: String,
    required: true,
  },
  isEnded: {
    type: Boolean,
    default: false,
  },
  endedTime: {
    type: String,
  },
  streamInfo: {
    type: Object,
  },
  group: {
    type: String,
    required: true,
  },
  science: {
    type: String,
    required: true,
  },
  teacher: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    name: { type: String, required: true },
  },
  comments: [commentSchema],
  rating: {
    totalRating: {
      type: Number,
      default: 0,
    },
    ratings: [ratingSchema],
  },
  viewers: [
    {
      name: {
        type: String,
        required: true,
      },
      id: mongoose.Types.ObjectId,
      profileImage: {
        type: String,
        required: true,
      },
      science: {
        type: String,
        required: true,
      },
    },
  ],
});

const Stream = mongoose.model("Stream", streamSchema);

export default Stream;
