import { Schema, model, Types } from "mongoose";

const percentSchema = new Schema(
  {
    persent: {
      type: Number,
      required: true,
    },
    student: {
      type: Types.ObjectId,
      required: true,
    },
    science: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const percentModel = model("percent", percentSchema);

export default percentModel;
