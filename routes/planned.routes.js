import express from "express";
import plannedModel from "../models/planned.model.js";
import cron from "node-cron";

const router = express.Router();

router.get("/planned/all", async (req, res) => {
  try {
    const planneds = await plannedModel.find();

    res.json(
      planneds.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    );
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});
router.post("/planned/create", async (req, res) => {
  try {
    const planned = await plannedModel.create(req.body);
    res.json(planned);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});
router.delete("/planned/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const planned = await plannedModel.findById(id);
    if (!planned) {
      return res.status(400).json({ message: "Bunday planned topilmadi" });
    }
    await plannedModel.findByIdAndDelete(planned._id);
    res.json({ message: "Planned Muaffaqqiyatli ochirildi" });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

// Custom formatdagi vaqtni ISO 8601 formatga aylantirish funksiyasi
const convertToISO = (dateString) => {
  const [datePart, timePart] = dateString.split(" ");
  const [year, month, day] = datePart.split(".");
  const [hour, minute] = timePart.split(":");

  // Yangi `Date` obyektini yaratish
  const date = new Date(year, month - 1, day, hour, minute);
  return date.toISOString();
};

// Vaqtni tekshirish va eski yozuvlarni o'chirish funksiyasi
const deleteOldPlannedEntries = async () => {
  try {
    const now = new Date(); // Hozirgi vaqt
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000); // Hozirgi vaqtdan 10 daqiqa oldingi vaqt

    // Eski yozuvlarni o'chirish
    const deleted = await plannedModel.deleteMany({
      dateTime: { $lt: tenMinutesAgo.toISOString() }, // ISO formatda tekshirish
    });

    console.log(`${deleted.deletedCount} eski yozuv o'chirildi.`);
  } catch (error) {
    console.error("Eski yozuvlarni o'chirishda xato yuz berdi:", error.message);
  }
};

// `cron job` orqali har daqiqada tekshirish
cron.schedule("* * * * *", async () => {
  console.log("Planned yozuvlarni tekshirish va tozalash...");

  // Yozuvlarni o'zgartirishdan oldin formatni ISO ga moslashtirish
  const plannedEntries = await plannedModel.find();
  for (const entry of plannedEntries) {
    if (!entry.dateTime.includes("T")) {
      const isoDateTime = convertToISO(entry.dateTime);
      entry.dateTime = isoDateTime;
      await entry.save(); // ISO formatga o'zgartirilgan yozuvni saqlash
    }
  }

  // Eski yozuvlarni o'chirishni chaqirish
  deleteOldPlannedEntries();
});

export default router;
