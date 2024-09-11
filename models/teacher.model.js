import mongoose from "mongoose";

const teacherModel = mongoose.model("Teacher", {
  name: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  science: {
    type: String,
    required: true,
  },
  rating: {
    type: Object, // {rating: 4.5, rating: [{}]
    default: {},
  },
});

export default teacherModel;
