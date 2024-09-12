import swaggerJsdoc from "swagger-jsdoc";

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
    "./routes/*.js", // barcha route fayllarini o'z ichiga oladi
  ],
};

export function generateSwaggerSpec() {
  return swaggerJsdoc(options);
}
