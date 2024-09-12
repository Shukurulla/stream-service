import express from "express";
import mongoose from "mongoose";
import { config } from "dotenv";
import cors from "cors";
import TeacherRouter from "./routes/teacher.route.js";
import StreamRoter from "./routes/stream.route.js";
import StreamFeedbackRouter from "./routes/stream.feedback.routes.js";
import StudentSignRouter from "./routes/student.routes.js";
import StudentNotificationRouter from "./routes/student.notification.routes.js";

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

app.use(TeacherRouter);
app.use(StreamRoter);
app.use(StreamFeedbackRouter);
app.use(StudentSignRouter);
app.use(StudentNotificationRouter);

app.listen(port, () => {
  console.log(`Server has ben started on port: ${port}`);
});
