import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "EduMeet API",
      version: "1.0.0",
      description: "API for Managing todo calls",
      contact: {
        name: "API Support",
        email: "",
      },
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
    "./routes/*.js", // path to your API routes
  ],
};

export function generateSwaggerSpec() {
  return swaggerJsdoc(options);
}
