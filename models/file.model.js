import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    from: {
      id: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      profileImage: {
        type: String,
        required: true,
      },
      science: {
        type: String,
        required: true,
      },
    },
    group: {
      name: {
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

const FileModel = mongoose.model("file", fileSchema);

export default FileModel;
