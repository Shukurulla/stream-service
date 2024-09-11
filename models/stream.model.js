import mongoose from "mongoose";

const streamModel = mongoose.model("Stream", {
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  planStream: {
    type: String,
    required: true,
  },
  classRoom: {
    type: String,
    required: true,
  },
  isStart: {
    type: Boolean,
    required: true,
  },
  isEnded: {
    type: Boolean,
  },
  streamInfo: {
    liveStreamId: {
      type: String,
      required: true,
    },
    streamKey: {
      type: String,
      required: true,
    },
    assets: {
      iframe: {
        type: String,
        required: true,
      },
      player: {
        type: String,
        required: true,
      },
      hls: {
        type: String,
        required: true,
      },
    },
  },
  teacher: {
    type: String,
  },
});

export default streamModel;
