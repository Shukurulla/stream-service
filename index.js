import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import TeacherRouter from "./routes/teacher.route.js";
import StreamRouter from "./routes/stream.route.js";
import StreamFeedbackRouter from "./routes/stream.feedback.routes.js";
import StudentSignRouter from "./routes/student.routes.js";
import StudentNotificationRouter from "./routes/student.notification.routes.js";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "./swagger.json" assert { type: "json" };
import { generateSwaggerSpec } from "./swagger.js";

const app = express();
app.use(
  cors({
    origin: "*",
    optionsSuccessStatus: 200,
    credentials: true,
  })
);

app.use(express.json());

const port = process.env.PORT || 3000;
const mongo_uri = process.env.MONGO_URI;

mongoose.connect(mongo_uri).then(() => {
  console.log("mongoDb connected");
});

// Routerlarni ulash
app.use(TeacherRouter);
app.use(StreamRouter);
app.use(StreamFeedbackRouter);
app.use(StudentSignRouter);
app.use(StudentNotificationRouter);

// Generate Swagger spec dynamically
const swaggerSpec = generateSwaggerSpec();

// Swaggerni o'rnatish
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.listen(port, () => {
  console.log(`Server started on port: ${port}`);
});
