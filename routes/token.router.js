import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

let token = process.env.API_KEY;
let expiresAt = Date.now() + 60 * 60 * 1000; // Token muddati, masalan, 1 soat keyingi vaqtni belgilash

// Yangi token olish funksiyasi
const refreshToken = async () => {
  try {
    const response = await axios.post(process.env.TOKEN_REFRESH_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${process.env.API_KEY}`,
        "Content-Type": "application/json",
      },
    });
    token = response.data.access_token;
    expiresAt = Date.now() + response.data.expires_in * 1000; // Yangi muddatni saqlash
  } catch (error) {
    console.error("Tokenni yangilashda xatolik:", error);
  }
};

// Tokenni tekshirish va qaytarish marshruti
router.get("/get-token", async (req, res) => {
  // Agar tokenning muddati tugagan bo'lsa, yangi token oling
  if (Date.now() >= expiresAt) {
    await refreshToken();
  }

  res.json({ token });
});

export default router;
