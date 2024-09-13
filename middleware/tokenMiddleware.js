import axios from "axios";

// Tokenlarni saqlash uchun o'zgaruvchilar
let accessToken = null;
let refreshToken = null;

export const initTokens = async () => {
  try {
    const response = await axios.post(
      "https://sandbox.api.video/auth/api-key",
      {
        apiKey: process.env.API_VIDEO_KEY,
      }
    );

    accessToken = response.data.access_token;
    refreshToken = response.data.refresh_token;
    // Bu bilan tokenlarni ko'rishingiz mumkin
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
    res.status(401).json({
      error: "Token yangilashda xatolik",
      details: error.response ? error.response.data : error.message,
    });
  }
};
