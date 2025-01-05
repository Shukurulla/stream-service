import mongoose from "mongoose";

const plannedSchema = new mongoose.Schema(
  {
    theme: {
      type: String,
      reqiured: true,
    },
    group: {
      type: String,
      required: true,
    },
    dateTime: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const plannedModel = mongoose.model("planned", plannedSchema);

export default plannedModel;
