import mongoose from "mongoose";

const studentModel = mongoose.model("Student", {
  name: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    requried: true,
  },
  phone: {
    type: String,
    required: true,
  },
  originalPassword: {
    type: String,
    required: true,
  },
  group: {
    type: String,
    required: true,
  },
  profileImage: {
    type: String,
    required: true,
  },
});

export default studentModel;
