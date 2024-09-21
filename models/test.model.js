import { Schema, model } from "mongoose";

const testSchema = new Schema(
  {
    data: {
      type: Object,
    },
  },
  { timestamps: true }
);

const testModel = model("test", testSchema);

export default testModel;
