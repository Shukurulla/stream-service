import jwt from "jsonwebtoken";
import { config } from "dotenv";

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userData = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Autentifikatsiya amalga oshmadi" });
  }
};

export default authMiddleware;