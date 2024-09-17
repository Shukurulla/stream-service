import axios from "axios";
import * as jwtDecode from "jwt-decode";
import dotenv from "dotenv";

dotenv.config();

let accessToken = null;
let refreshToken = null;

export const initTokens = () => {
  accessToken = process.env.API_VIDEO_KEY;
  refreshToken = process.env.API_VIDEO_REFRESH;

  if (!accessToken || !refreshToken) {
    console.error(
      "ACCESS_TOKEN yoki REFRESH_TOKEN environment o'zgaruvchilari o'rnatilmagan"
    );
  } else {
    console.log("Tokenlar muvaffaqiyatli yuklandi");
  }
};

export const tokenMiddleware = async (req, res, next) => {
  try {
    if (!accessToken || !refreshToken) {
      console.error(
        "Tokenlar mavjud emas. initTokens() chaqirilganligini tekshiring."
      );
      throw new Error("Access token yoki refresh token mavjud emas");
    }

    if (isTokenExpired(accessToken)) {
      console.log("Access token muddati tugagan, yangilanmoqda...");
      await refreshAccessToken();
    }

    req.headers["Authorization"] = `Bearer ${accessToken}`;
    next();
  } catch (error) {
    console.error("Token middleware xatosi:", error.message);
    res
      .status(401)
      .json({ message: "Autentifikatsiya xatosi", error: error.message });
  }
};

const isTokenExpired = (token) => {
  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  } catch (error) {
    console.error("Token dekodlash xatosi:", error);
    return true; // Xato yuz berganda tokenni eskirgan deb hisoblaymiz
  }
};

const refreshAccessToken = async () => {
  try {
    if (!refreshToken) {
      throw new Error("Refresh token mavjud emas");
    }

    const response = await axios.post(
      "https://ws.api.video/auth/refresh",
      { refreshToken: refreshToken },
      { headers: { "Content-Type": "application/json" } }
    );

    accessToken = response.data.access_token;
    refreshToken = response.data.refresh_token;

    console.log("Access token muvaffaqiyatli yangilandi");

    // Yangi tokenlarni saqlash (masalan, env faylga yoki xavfsiz xotiraga)
    // Bu yerda tokenlarni saqlash logikasini qo'shishingiz mumkin
  } catch (error) {
    console.error(
      "Access token yangilash xatosi:",
      error.response?.data || error.message
    );
    throw new Error("Access tokenni yangilashda xatolik yuz berdi");
  }
};
