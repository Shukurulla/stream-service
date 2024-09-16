import axios from "axios";

// Tokenlarni saqlash uchun o'zgaruvchilar
let accessToken = null;
let refreshToken = null;

// Bu o'zgaruvchi tokenni yuklash jarayonini boshqaradi
let isTokenLoading = false;

export const initTokens = async () => {
  if (!isTokenLoading) {
    try {
      isTokenLoading = true; // Yuklanayotganini belgilash
      const response = await axios.post(
        "https://sandbox.api.video/auth/api-key",
        {
          apiKey: process.env.API_VIDEO_KEY,
        }
      );

      accessToken = response.data.access_token;
      refreshToken = response.data.refresh_token;
      isTokenLoading = false; // Yuklash tugadi
    } catch (error) {
      console.error("Tokenlarni olishda xatolik:", error.message);
      isTokenLoading = false; // Hatto xato bo'lsa ham yuklashni tugatish
    }
  }
};

// Token yangilovchi middleware
export const tokenMiddleware = async (req, res, next) => {
  try {
    // Agar accessToken mavjud bo'lmasa yoki eskirgan bo'lsa
    if (!accessToken && !isTokenLoading) {
      await initTokens(); // Tokenlarni qayta yuklash
    }

    // Agar accessToken mavjud bo'lsa, so'rovga qo'shing
    if (accessToken) {
      req.headers["Authorization"] = `Bearer ${accessToken}`;
      next();
    } else {
      res.status(401).json({
        error: "Token yangilashda xatolik",
        details: "Token mavjud emas",
      });
    }
  } catch (error) {
    res.status(401).json({
      error: "Token yangilashda xatolik",
      details: error.response ? error.response.data : error.message,
    });
  }
};
