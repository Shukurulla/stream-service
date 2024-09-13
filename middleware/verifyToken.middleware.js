import jwt from "jsonwebtoken";

// JWT ni tekshiruvchi middleware
export const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // "Bearer TOKEN" dan TOKEN qismi olinadi

  if (!token) {
    return res.status(403).json({ message: "Token kerak" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // JWT ni dekod qilamiz
    req.user = decoded; // Foydalanuvchi ma'lumotlarini saqlaymiz
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Token noto'g'ri yoki amal qilish muddati tugagan" });
  }
};
