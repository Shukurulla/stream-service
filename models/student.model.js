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
  originalPassword: {
    type: String,
    required: true,
  },
  group: {
    type: String,
    required: true,
  },
  kurs: {
    type: String,
  },
  profileImage: {
    type: String,
    required: true,
  },
});

export default studentModel;