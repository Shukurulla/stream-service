import express from "express";
import mongoose from "mongoose";
import { config } from "dotenv";
import cors from "cors";
config();

const app = express();
app.use(
  cors({
    origin: "*",
    optionsSuccessStatus: 200,
    credentials: true,
  })
);
app.use(express.json());
const port = process.env.PORT;
const mongo_uri = process.env.MONGO_URI;

mongoose.connect(mongo_uri).then(() => {
  console.log("mongoDb connected");
});

app.listen(port, () => {
  console.log(`Server has ben started on port: ${port}`);
});
