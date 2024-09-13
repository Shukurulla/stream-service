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
    if (!accessToken) {
      const refreshResponse = await axios.post(
        "https://sandbox.api.video/auth/refresh",
        {
          refresh_token: refreshToken,
        }
      );

      accessToken = refreshResponse.data.access_token;
      refreshToken = refreshResponse.data.refresh_token;
    }

    req.headers["Authorization"] = `Bearer ${accessToken}`;
    next();
  } catch (error) {
    console.error(
      "Token yangilashda xatolik:",
      error.response ? error.response.data : error.message
    );
    res.status(401).json({
      error: "Token yangilashda xatolik",
      details: error.response ? error.response.data : error.message,
    });
  }
};
