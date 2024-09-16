import mongoose from "mongoose";
const studentScoreModel = mongoose.model("Score", {
  student: {
    id: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
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
