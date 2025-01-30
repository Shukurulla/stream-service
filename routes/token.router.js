import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

let token = process.env.API_KEY;
let expiresAt = Date.now() + 60 * 60 * 1000; // 1 soat (yangi token muddati)

// Vaqtni formatlash funksiyasi
const formatDateTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toISOString().replace("T", " ").slice(0, 19);
};

// Yangi token olish funksiyasi
const refreshToken = async () => {
  console.log("🔄 Token yangilanmoqda...");
  try {
    const response = await axios.post(
      process.env.TOKEN_REFRESH_ENDPOINT,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("🔍 API javobi:", response.data); // <-- API javobini tekshirish

    if (response.data.access_token && response.data.expires_in) {
      token = response.data.access_token;
      expiresAt = Date.now() + response.data.expires_in * 1000;
      console.log("✅ Yangi token olindi:", token);
      console.log(
        "🕒 Tokenning yangi muddati:",
        new Date(expiresAt).toLocaleString()
      );
    } else {
      console.error("❌ API yangi token bermadi, javob:", response.data);
    }
  } catch (error) {
    console.error("❌ Tokenni yangilashda xatolik:", error.message);
  }
};

// Tokenni tekshirish va qaytarish marshruti
router.get("/get-token", async (req, res) => {
  try {
    if (Date.now() >= expiresAt) {
      await refreshToken();
    }
    const expiresDate = new Date(expiresAt);

    res.json({
      token,
      expiresAt: `${expiresDate.toString()}`,
    });
  } catch (error) {
    console.error("❌ Tokenni yuborishda xatolik:", error.message);
    res.status(500).json({ error: "Tokenni olishda xatolik yuz berdi" });
  }
});

export default router;
