import mongoose from "mongoose";

const themeFeedBackSchema = new mongoose.Schema(
  {
    teacher: {
      name: {
        type: String,
        required: true,
      },
      science: {
        type: String,
        required: true,
      },
      profileImage: {
        type: String,
        required: false,
      },
      id: {
        type: mongoose.Types.ObjectId,
        required: true,
      },
    },
    theme: {
      type: Object,
      required: true,
    },
    group: {
      type: String,
      required: true,
    },
    student: {
      name: {
        type: String,
        required: true,
      },
      group: {
        type: String,
        required: true,
      },
      profileImage: {
        type: String,
        required: false,
      },
      id: {
        type: mongoose.Types.ObjectId,
        required: true,
      },
    },
    rating: {
      type: Number,
    },
    voiceMessage: {
      type: String,
    },
    feedback: {
      type: String,
    },
  },
  { timestamps: true }
);

const ThemeFeedbackModel = mongoose.model("themeFeedback", themeFeedBackSchema);

export default ThemeFeedbackModel;
