import mongoose from "mongoose";
const studentScoreModel = mongoose.model("Score", {
  student: {
    profileImage: {
      type: String,
    },
    name: {
      type: String,
      required: true,
    },
    group: {
      type: String,
      required: true,
    },
  },
  studentId: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  lesson: {
    type: String,
    required: true,
  },
  score: {
    type: Number,
    required: true,
  },
});

export default studentScoreModel;
