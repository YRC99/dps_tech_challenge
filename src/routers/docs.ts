import express from "express";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
const router = express.Router();
const specs = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "My API",
      version: "1.0.0",
    },
  },
  apis: ["./src/routers/*.ts"],
});
router.use("/docs", swaggerUi.serve, swaggerUi.setup(specs));
export { router };
