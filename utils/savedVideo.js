import axios from "axios";

const API_VIDEO_BASE_URL = "https://ws.api.video";
const API_VIDEO_TOKEN = process.env.API_VIDEO_KEY; // API.video tokeningizni shu yerga qo'ying

/**
 * Live stream ID orqali saqlangan videoni qaytaradi
 * @param {string} liveStreamId
 * @returns {Promise<Object>} Saqlangan video haqida ma'lumot
 */
async function getSavedVideoByLiveStreamId(liveStreamId) {
  try {
    // Live stream haqida ma'lumot olish
    const liveStreamResponse = await axios.get(
      `${API_VIDEO_BASE_URL}/live-streams/${liveStreamId}`,
      {
        headers: {
          Authorization: `Bearer ${API_VIDEO_TOKEN}`,
        },
      }
    );

    const liveStreamData = liveStreamResponse.data;

    // Saqlangan videoId'ni olish
    const videoId = liveStreamData.assets?.videoId;

    if (!videoId) {
      throw new Error("Streamga bog'liq saqlangan video topilmadi.");
    }

    // Saqlangan video haqida ma'lumot olish
    const videoResponse = await axios.get(
      `${API_VIDEO_BASE_URL}/videos/${videoId}`,
      {
        headers: {
          Authorization: `Bearer ${API_VIDEO_TOKEN}`,
        },
      }
    );

    return videoResponse.data;
  } catch (error) {
    console.error("Xatolik:", error.message);
    throw error;
  }
}

// Funksiyani sinash
export default getSavedVideoByLiveStreamId;
