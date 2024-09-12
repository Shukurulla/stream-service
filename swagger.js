import swaggerJsdoc from "swagger-jsdoc";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "EduMeet API",
      version: "1.0.0",
      description: "API for Managing EduMeet operations",
    },
    servers: [
      {
        url: "https://stream-service-amber.vercel.app",
        description: "Production server",
      },
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
  },
  apis: [
    path.join(__dirname, "./routes/*.js"),
    path.join(__dirname, "./models/*.js"),
  ],
};

export function generateSwaggerSpec() {
  return swaggerJsdoc(options);
}
