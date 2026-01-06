import { Router } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { getConfig } from "@repo/config";

const router: Router = Router();

// Swagger configuration
const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "AI Muhasebi API",
      version: "1.0.0",
      description: "Turkish Accounting SaaS Platform API Documentation",
      contact: {
        name: "API Support",
        email: "support@aimuhasebi.com",
      },
      license: {
        name: "Proprietary",
      },
    },
    servers: [
      {
        url: process.env.API_URL || "http://localhost:3800",
        description: process.env.NODE_ENV === "production" ? "Production server" : "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      { name: "Authentication", description: "Authentication endpoints" },
      { name: "Users", description: "User management endpoints" },
      { name: "Tenants", description: "Tenant management endpoints" },
      { name: "Client Companies", description: "Client company management" },
      { name: "Documents", description: "Document management and AI analysis" },
      { name: "Invoices", description: "Invoice management" },
      { name: "Risk", description: "Risk scoring and alerts" },
      { name: "Reports", description: "Report generation and management" },
      { name: "Integrations", description: "Integration management" },
      { name: "Notifications", description: "Notification management" },
      { name: "Health", description: "Health check endpoints" },
    ],
  },
  apis: [
    "./src/routes/*.ts",
    "./src/routes/**/*.ts",
  ],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI route (only in non-production environments or with proper authentication)
if (process.env.NODE_ENV !== "production" || process.env.ENABLE_SWAGGER === "true") {
  router.use("/", swaggerUi.serve);
  router.get("/", swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "AI Muhasebi API Documentation",
  }));

  // JSON endpoint for OpenAPI spec
  router.get("/json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });
} else {
  router.get("/", (req, res) => {
    res.status(404).json({ message: "API documentation is not available in production" });
  });
}

export default router;



