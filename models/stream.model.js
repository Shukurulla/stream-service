import mongoose from "mongoose";

const streamSchema = new mongoose.Schema(
  {
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
      type: String,
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
    streamId: {
      type: String,
      required: true,
    },
    isStart: {
      type: Boolean,
      default: false,
    },
    teacher: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Teacher",
        required: true,
      },
      name: { type: String, required: true },
      profileImage: {
        type: String,
      },
    },
    comments: [
      {
        user: {
          id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          name: { type: String, required: true },
          profileImage: {
            type: String,
            required: true,
          },
        },
        comment: { type: String, required: true },
        date: { type: Date, default: Date.now },
      },
    ],
    rating: {
      totalRating: {
        type: Number,
        default: 0,
      },
      ratings: [
        {
          teacher: {
            name: { type: String, required: true },
            id: { type: String, required: true },
            profileImage: {
              type: String,
              required: true,
            },
          },
          rate: { type: Number, min: 1, max: 5, required: true },
          comment: { type: String },
          voiceMessage: { type: String },
          feedback: { type: String },
          date: { type: Date, default: Date.now },
          read: { type: Boolean, default: false },
          quests: {
            type: Object,
            required: true,
          },
        },
      ],
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
    assets: {
      type: Object,
    },
  },
  { timestamps: true }
); // timestamps qo'shildi

const Stream = mongoose.model("Stream", streamSchema);

export default Stream;
