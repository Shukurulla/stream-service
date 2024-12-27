import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import TeacherRouter from "./routes/teacher.route.js";
import StreamRouter from "./routes/stream.route.js";
import StreamFeedbackRouter from "./routes/stream.feedback.routes.js";
import StudentSignRouter from "./routes/student.routes.js";
import StudentNotificationRouter from "./routes/student.notification.routes.js";
import GroupRouter from "./routes/group.routes.js";
import swaggerUi from "swagger-ui-express";
import tokenRouter from "./routes/token.router.js";
import { generateSwaggerSpec } from "./swagger.js";
import { tokenMiddleware, initTokens } from "./middleware/tokenMiddleware.js";
import ScoreRouter from "./routes/student.score.routes.js";
import PercentRouter from "./routes/percent.routes.js";
import ThemeRouter from "./routes/theme.routes.js";
import ThemeFeedbackRouter from "./routes/themeFeedback.routes.js";
import fileUpload from "express-fileupload";
import FileRouter from "./routes/files.routes.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { v2 as cloudinary } from "cloudinary";

// Cloudinary sozlamalari
cloudinary.config({
  cloud_name: "djsdapm3z", // Cloudinary Dashboard'dan oling
  api_key: "717997715311428",
  api_secret: "Aob_1Si2WfnE3k70RWDyZAOdk0E",
});

const app = express();
app.use(
  cors({
    origin: "*",
    optionsSuccessStatus: 200,
    credentials: true,
  })
);
app.use(fileUpload());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set(express.static("public"));

// Dastlabki tokenlarni yuklash
initTokens();

// Token middleware'ni ulash
app.use(tokenMiddleware);

const port = process.env.PORT || 3000;
const mongo_uri = process.env.MONGO_URI;

mongoose.connect(mongo_uri).then(() => {
  console.log("mongoDb connected");
});

// Swagger UI fayllarini statik tarzda xizmat qilish
app.use(
  "/swagger-ui",
  express.static(path.join(__dirname, "node_modules/swagger-ui-dist"))
);

// Routerlarni ulash
app.use(TeacherRouter);
app.use(StreamRouter);
app.use(StreamFeedbackRouter);
app.use(StudentSignRouter);
app.use(StudentNotificationRouter);
app.use(GroupRouter);
app.use(ScoreRouter);
app.use(PercentRouter);
app.use(tokenRouter);
app.use(ThemeRouter);
app.use(ThemeFeedbackRouter);
app.use(FileRouter);
// Generate Swagger spec dynamically
const swaggerSpec = generateSwaggerSpec();

// Swaggerni o'rnatish
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.listen(port, () => {
  console.log(`Server started on port: ${port}`);
});
