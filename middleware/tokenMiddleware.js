import axios from "axios";
import { jwtDecode } from "jwt-decode";
import dotenv from "dotenv";

dotenv.config();

let accessToken = null;
let refreshToken = null;

export const initTokens = () => {
  accessToken = process.env.API_VIDEO_KEY;
  refreshToken = process.env.API_VIDEO_REFRESH;
  console.log("Local Access Token:", process.env.API_VIDEO_KEY);
  console.log("Local Refresh Token:", process.env.API_VIDEO_REFRESH);

  if (!accessToken || !refreshToken) {
    console.error(
      "ACCESS_TOKEN yoki REFRESH_TOKEN environment o'zgaruvchilari o'rnatilmagan"
    );
  } else {
    console.log("Tokenlar muvaffaqiyatli yuklandi");
    console.log("Access Token:", accessToken);
    console.log("Refresh Token:", refreshToken);
  }
};

// Token muddati tugaganini tekshiradigan funksiya
const isTokenExpired = (token) => {
  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;

    if (decoded.exp < currentTime) {
      return true;
    }
    return false;
  } catch (error) {
    console.error("Token dekodlash xatosi:", error.message);
    return true;
  }
};

// Yangi access token olish funksiyasi
const refreshAccessToken = async () => {
  try {
    const response = await axios.post("https://ws.api.video/auth/api-key", {
      apiKey: accessToken,
    });

    if (response.data && response.data.access_token) {
      accessToken = response.data.access_token;
      refreshToken = response.data.refresh_token;
      console.log("Yangi Access Token olindi:", accessToken);
    } else {
      throw new Error("Access token yangilanishida kutilmagan javob olindi.");
    }
  } catch (error) {
    console.error(
      "Access tokenni yangilashda xatolik yuz berdi:",
      error.response?.data || error.message
    );
    throw new Error("Access tokenni yangilashda xatolik yuz berdi");
  }
};

// Token middleware
export const tokenMiddleware = async (req, res, next) => {
  try {
    if (!accessToken || !refreshToken) {
      console.error(
        "Tokenlar mavjud emas. initTokens() chaqirilganligini tekshiring."
      );
      throw new Error("Access token yoki refresh token mavjud emas");
    }

    console.log("Dekodlashdan oldingi Access Token:", accessToken);

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
