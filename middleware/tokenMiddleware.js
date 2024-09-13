import axios from "axios";

// Tokenlarni saqlash uchun o'zgaruvchilar
let accessToken = null;
let refreshToken = null;

// Tokenlarni boshlang'ich holatda yuklash uchun funksiya
export const initTokens = async () => {
  try {
    const response = await axios.post(
      "https://sandbox.api.video/auth/api-key",
      {
        apiKey: process.env.API_VIDEO_KEY, // API kalitini bu yerda kiritasiz
      }
    );

    accessToken = response.data.access_token;
    refreshToken = response.data.refresh_token;
  } catch (error) {
    console.error("Tokenlarni olishda xatolik:", error.message);
  }
};

// Token yangilovchi middleware
export const tokenMiddleware = async (req, res, next) => {
  try {
    // Access token borligini va uning muddati tugaganligini tekshirish
    if (!accessToken) {
      // Avval refresh token orqali yangilash jarayonini boshlaymiz
      const refreshResponse = await axios.post(
        "https://sandbox.api.video/auth/refresh",
        {
          refresh_token: refreshToken,
        }
      );

      // Yangi tokenlar olish
      accessToken = refreshResponse.data.access_token;
      refreshToken = refreshResponse.data.refresh_token;
    }

    // Access tokenni so'rovga qo'shish
    req.headers["Authorization"] = `Bearer ${accessToken}`;

    // Keyingi middleware yoki route ga o'tkazish
    next();
  } catch (error) {
    // Agar refresh token ham o'zgarisa, 401 xatolikni chiqarish
    res.status(401).json({ error: "Token yangilashda xatolik" });
  }
};
