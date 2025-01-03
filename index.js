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
import teacherModel from "./models/teacher.model.js";
import groupModel from "./models/group.model.js";
import FileModel from "./models/file.model.js";
import slugify from "slugify";

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

app.use("/public", express.static(path.join(__dirname, "public")));

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
app.post("/files/create", async (req, res) => {
  try {
    const { title, group, teacherId, description } = req.body;
    if (!req.files || !req.files.file) {
      return res.status(400).send("File is required");
    }

    const findTeacher = await teacherModel.findById(teacherId);
    if (!findTeacher) {
      return res.status(400).send("Teacher topilmadi");
    }
    const findGroup = await groupModel.findOne({ name: group });
    if (!findGroup) {
      return res.status(400).send("Group topilmadi");
    }

    const file = req.files.file;

    // Fayl nomini slug formatiga o‘tkazish
    const slug = slugify(file.name, { lower: true, strict: true });
    const filePath = `/public/files/${Date.now()}_${slug}`;

    // Faylni saqlash
    file.mv(path.join(__dirname, filePath), async (err) => {
      if (err) {
        return res.status(500).send(err);
      }

      // Fayl muvaffaqiyatli saqlangandan so'ng DB ga qo'shish
      try {
        const fileSchema = {
          title,
          description,
          group: {
            name: findGroup.name,
            id: findGroup._id,
          },
          from: {
            name: findTeacher.name,
            science: findTeacher.science,
            profileImage: findTeacher.profileImage,
            id: findTeacher._id,
          },
          fileUrl: filePath,
          slug, // Slugni qo'shish
        };
        const fileDB = await FileModel.create(fileSchema);
        if (!fileDB) {
          return res.status(400).json({ message: "File yaratilmadi" });
        }
        res.json(fileDB);
      } catch (err) {
        res.status(500).send("Serverda xatolik yuz berdi: " + err.message);
      }
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Swaggerni o'rnatish
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.listen(port, () => {
  console.log(`Server started on port: ${port}`);
});
