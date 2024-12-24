import mongoose from "mongoose";

const themeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    group: {
      type: String,
      required: true,
    },
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
        required: true,
      },
      id: {
        type: mongoose.Types.ObjectId,
        required: true,
      },
    },
  },
  { timestamps: true }
);

const ThemeModel = mongoose.model("theme", themeSchema);

export default ThemeModel;
