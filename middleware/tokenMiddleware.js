import axios from "axios";

// Tokenlarni saqlash uchun o'zgaruvchilar
let accessToken =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpYXQiOjE3MjYyOTQzNzEuNDQ3NDExLCJuYmYiOjE3MjYyOTQzNzEuNDQ3NDExLCJleHAiOjE3MjYyOTc5NzEuNDQ3NDExLCJwcm9qZWN0SWQiOiJwcm9qZWN0XzFDRjZDRGQzbnFEZ1ZnQk1VcWJESFoiLCJhcGlLZXkiOiJhcGlfa2V5XzFDRjhybkh0TnVEWUZnZ2pKcW83VE0ifQ.iHbw5wtc5EWDrVFNAIkNq958RAlm9BYUvtKDb_8Drk1w-CJ0VDK4CE1FrqBndT5Oq_UwG6NCIhDLsIhsn8iesEuzyWKRzYXeCdrVGGTcdf8tZrVxvyCm-GiAjVROtorfwjtiEHfHUgP4wDI-IIynBWSSsWtZzRPc_JrT-s50p2FDrCBuSgFZk7TXw2G6qn1c--EFbHMnrcVvDMg2eopw_o-Wf0IIMYCT0guaNbQIB5ksa35tQt2XEXR7FoaWO7ihlZRv-TqACoJkQVQO1tOl5KRXzG6ZLubkI0Z3qFrbhI9XJiZTYYdMcDchITnIhiZTBseN8Ncj_imvI-hx9WZcCA";
let refreshToken =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpYXQiOjE3MjYyOTQzNzEuNDQ5MDA0LCJuYmYiOjE3MjYyOTQzNzEuNDQ5MDA0LCJleHAiOjE3Mjg4ODYzNzEuNDQ5MDA0LCJyZWZyZXNoVG9rZW4iOnRydWUsInByb2plY3RJZCI6InByb2plY3RfMUNGNkNEZDNucURnVmdCTVVxYkRIWiIsImFwaUtleSI6ImFwaV9rZXlfMUNGOHJuSHROdURZRmdnakpxbzdUTSJ9.NEiAsgSt9r0gyuokhczaynCn1955IjasWuUHH2Er3MRk3xmlZXPHDvYOVCv-Zc50HqsqhnOscFq-H2nT_cZz-3_H3wf-UBFS55LqWPzl-09u_MMGyxZh1X_b9WvoQp5qiAKWHRywNOrUfOQAAEV-oFRc6ExdNtVGxmEptBMjSttrjfZy9Uv4n_-gY3U3uRkQu8f6rFujD8ESSfjjzJ-ApOw6k54VIWno7SLqWtKr7zQdvVGkU7EuwQ3lBesE7dw4iDXg5JV6YHIjgaof_XpX81a6OX_U3Zg0k5xxGfaXsbisyXY_562gSHVsrjtyfR0aQP-58ZyV590vqIHYWcJA2Q";

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
