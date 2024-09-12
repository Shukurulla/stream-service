import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Your API Title",
      version: "1.0.0",
    },
  },
  apis: ["./routes/*.js"], // Adjust this path to match your route files
};

const swaggerSpec = swaggerJsdoc(options);

const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "Your API Title",
    version: "1.0.0",
  },
  paths: swaggerSpec.paths,
  components: swaggerSpec.components,
};

export { swaggerUi, swaggerDocument };
