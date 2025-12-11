import { Router, type Response, type NextFunction, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { emailTemplateService } from "../services/email-template-service";
import { emailService } from "../services/email-service";
import { authMiddleware } from "../middleware/auth-middleware";
import { tenantMiddleware } from "../middleware/tenant-middleware";
import { requirePermission } from "../middleware/rbac-middleware";
import type { AuthenticatedRequest } from "../types/request-context";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const router: ExpressRouter = Router();

// All routes require authentication and tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

// Only TenantOwner and Accountant can manage templates
router.use(requirePermission("settings:update"));

// GET /api/v1/email-templates - List all templates
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const templatesDir = join(__dirname, "../../templates/email");
    const templateFiles = [
      "notification",
      "report",
      "risk-alert",
      "client-communication",
      "welcome",
    ];

    const templates = templateFiles.map((name) => {
      try {
        const content = readFileSync(join(templatesDir, `${name}.html`), "utf-8");
        return {
          name,
          exists: true,
          size: content.length,
        };
      } catch {
        return {
          name,
          exists: false,
          size: 0,
        };
      }
    });

    res.json({ data: templates });
  } catch (error: any) {
    console.error("Error listing email templates:", error);
    const statusCode = error.statusCode || 500;
    const message = error.message || "Şablonlar alınırken bir hata oluştu.";
    res.status(statusCode).json({ error: { message } });
  }
});

// GET /api/v1/email-templates/:name - Get template content
router.get("/:name", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const templateName = req.params.name;
    const templatesDir = join(__dirname, "../../templates/email");
    const templatePath = join(templatesDir, `${templateName}.html`);

    try {
      const content = readFileSync(templatePath, "utf-8");
      res.json({ data: { name: templateName, content } });
    } catch (error: any) {
      if (error.code === "ENOENT") {
        res.status(404).json({ error: { message: "Şablon bulunamadı." } });
      } else {
        throw error;
      }
    }
  } catch (error: any) {
    next(error);
  }
});

// PUT /api/v1/email-templates/:name - Update template
router.put("/:name", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const templateName = req.params.name;
    const bodySchema = z.object({
      content: z.string().min(1, "Şablon içeriği boş olamaz"),
    });

    const body = bodySchema.parse(req.body);
    const templatesDir = join(__dirname, "../../templates/email");
    const templatePath = join(templatesDir, `${templateName}.html`);

    // Validate template name
    const allowedTemplates = [
      "notification",
      "report",
      "risk-alert",
      "client-communication",
      "welcome",
    ];
    if (!allowedTemplates.includes(templateName)) {
      return res.status(400).json({ error: { message: "Geçersiz şablon adı." } });
    }

    // Write template to file
    writeFileSync(templatePath, body.content, "utf-8");

    // Clear cache so new template is loaded
    emailTemplateService.clearCache();

    res.json({ data: { name: templateName, message: "Şablon güncellendi." } });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: { message: "Geçersiz istek verisi." } });
    } else {
      next(error);
    }
  }
});

// POST /api/v1/email-templates/:name/preview - Preview template with sample data
router.post("/:name/preview", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const templateName = req.params.name;
    const bodySchema = z.object({
      variables: z.record(z.any()).optional(),
    });

    const body = bodySchema.parse(req.body);
    const variables = body.variables || {};

    // Add default variables if not provided
    const defaultVariables = {
      year: new Date().getFullYear(),
      title: "Örnek Başlık",
      message: "Bu bir örnek mesajdır.",
      ...variables,
    };

    const html = await emailTemplateService.renderTemplate(templateName, defaultVariables);
    const text = await emailTemplateService.renderPlainText(templateName, defaultVariables);

    res.json({ data: { html, text } });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/v1/email-templates/:name/test - Send test email
router.post("/:name/test", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const templateName = req.params.name;
    const bodySchema = z.object({
      to: z.string().email("Geçerli bir e-posta adresi giriniz."),
      variables: z.record(z.any()).optional(),
      subject: z.string().optional(),
    });

    const body = bodySchema.parse(req.body);
    const variables = body.variables || {};

    // Add default variables
    const defaultVariables = {
      year: new Date().getFullYear(),
      title: "Test E-postası",
      message: "Bu bir test e-postasıdır.",
      ...variables,
    };

    const html = await emailTemplateService.renderTemplate(templateName, defaultVariables);
    const text = await emailTemplateService.renderPlainText(templateName, defaultVariables);

    await emailService.sendEmail({
      to: [body.to],
      subject: body.subject || `Test: ${templateName}`,
      body: text,
      html,
    });

    res.json({ data: { message: "Test e-postası gönderildi." } });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: { message: "Geçersiz istek verisi." } });
    } else {
      next(error);
    }
  }
});

export default router;

