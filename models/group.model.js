import mongoose from "mongoose";

const groupModel = mongoose.model("Group", {
  name: {
    type: String,
    required: true,
  },
});

export default groupModel;
