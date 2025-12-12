import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth-service";
import { AuthenticationError, ValidationError } from "@repo/shared-utils";
import type { AuthenticatedRequest } from "../types/request-context";
import { emailValidator } from "../utils/email-validation";

const router: ExpressRouter = Router();

const loginSchema = z.object({
  email: emailValidator,
  password: z.string().min(1, "Şifre gerekli."),
});

const registerSchema = z.object({
  user: z.object({
    email: emailValidator,
    password: z.string().min(1, "Şifre gerekli."),
    fullName: z.string().min(1, "Ad soyad gerekli."),
  }),
  tenant: z.object({
    name: z.string().min(1, "Ofis adı gerekli."),
    slug: z.string().min(1, "Ofis kısa adı gerekli.").regex(/^[a-z0-9-]+$/, "Kısa ad sadece küçük harf, rakam ve tire içerebilir."),
    taxNumber: z.string().optional(),
    phone: z.string().optional(),
    email: emailValidator.optional().or(z.literal("")),
    address: z.string().optional(),
  }),
});

const forgotPasswordSchema = z.object({
  email: emailValidator,
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token gerekli."),
  password: z.string().min(1, "Şifre gerekli."),
});

router.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = loginSchema.parse(req.body);
    const ipAddress = req.ip || req.socket.remoteAddress || undefined;

    const result = await authService.login(body, ipAddress);

    // Set refresh token in httpOnly cookie
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          fullName: result.user.fullName,
          locale: result.user.locale,
        },
        accessToken: result.accessToken,
        tenantId: result.tenantId,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new ValidationError(error.issues && error.issues.length > 0 ? error.issues[0].message : "Geçersiz giriş bilgileri."));
    }
    next(error);
  }
});

router.post("/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = registerSchema.parse(req.body);
    const ipAddress = req.ip || req.socket.remoteAddress || undefined;

    const result = await authService.register(body, ipAddress);

    // Set refresh token in httpOnly cookie
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          fullName: result.user.fullName,
          locale: result.user.locale,
        },
        tenant: {
          id: result.tenant.id,
          name: result.tenant.name,
          slug: result.tenant.slug,
        },
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      // ZodError uses 'issues' property
      if (error.issues && error.issues.length > 0) {
        const firstIssue = error.issues[0];
        // Each issue has a 'message' property
        const errorMessage = firstIssue.message || "Geçersiz kayıt bilgileri.";
        return next(new ValidationError(errorMessage));
      }
      return next(new ValidationError("Geçersiz kayıt bilgileri."));
    }
    next(error);
  }
});

router.post("/forgot-password", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = forgotPasswordSchema.parse(req.body);
    const ipAddress = req.ip || req.socket.remoteAddress || undefined;

    await authService.requestPasswordReset(body.email, ipAddress);

    // Always return success (don't reveal if email exists)
    res.json({
      data: {
        message: "Eğer bu e-posta kayıtlıysa, şifre sıfırlama bağlantısı gönderdik.",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new ValidationError(error.issues?.[0]?.message || "Geçersiz e-posta adresi."));
    }
    next(error);
  }
});

router.post("/reset-password", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = resetPasswordSchema.parse(req.body);
    const ipAddress = req.ip || req.socket.remoteAddress || undefined;

    await authService.resetPassword(body.token, body.password, ipAddress);

    res.json({
      data: {
        message: "Şifreniz başarıyla güncellendi.",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new ValidationError(error.issues?.[0]?.message || "Geçersiz bilgiler."));
    }
    next(error);
  }
});

router.post("/logout", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (req.context?.user) {
      const ipAddress = req.ip || req.socket.remoteAddress || undefined;
      await authService.logout(req.context.user.id, req.context.tenantId ?? null, ipAddress);
    }

    // Clear refresh token cookie
    res.clearCookie("refreshToken");

    res.json({
      data: {
        message: "Başarıyla çıkış yapıldı.",
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

