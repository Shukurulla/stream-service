import mongoose from "mongoose";

const studentNotificationModel = mongoose.model("studentNotification", {
  stream: {
    title: {
      // Stream Title
      type: String,
      required: true,
    },
    name: {
      // Teacher Name
      type: String,
      required: true,
    },
    profileImage: {
      //Teacher Image
      type: String,
      required: true,
    },
  },
  student: {
    // Student _id
    type: mongoose.Types.ObjectId,
    required: true,
  },
  from: {
    profileImage: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    science: {
      type: String,
      requrired: true,
    },
  },
  rate: {
    type: Number,
    required: true,
  },
  feedback: {
    type: String,
    required: true,
  },
  read: {
    type: Boolean,
    default: false,
  },
});

export default studentNotificationModel;
