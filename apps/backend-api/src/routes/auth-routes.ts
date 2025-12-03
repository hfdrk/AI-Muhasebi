import { Router } from "express";
import { z } from "zod";
import { authService } from "../services/auth-service";
import { AuthenticationError, ValidationError } from "@repo/shared-utils";
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../types/request-context";

const router = Router();

const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi giriniz."),
  password: z.string().min(1, "Şifre gerekli."),
});

const registerSchema = z.object({
  user: z.object({
    email: z.string().email("Geçerli bir e-posta adresi giriniz."),
    password: z.string().min(1, "Şifre gerekli."),
    fullName: z.string().min(1, "Ad soyad gerekli."),
  }),
  tenant: z.object({
    name: z.string().min(1, "Ofis adı gerekli."),
    slug: z.string().min(1, "Ofis kısa adı gerekli.").regex(/^[a-z0-9-]+$/, "Sadece küçük harf, rakam ve tire kullanılabilir."),
    taxNumber: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email("Geçerli bir e-posta adresi giriniz.").optional().or(z.literal("")),
    address: z.string().optional(),
  }),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi giriniz."),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token gerekli."),
  password: z.string().min(1, "Şifre gerekli."),
});

router.post("/login", async (req: Request, res: Response) => {
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
      throw new ValidationError(error.errors[0]?.message || "Geçersiz giriş bilgileri.");
    }
    throw error;
  }
});

router.post("/register", async (req: Request, res: Response) => {
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
      throw new ValidationError(error.errors[0]?.message || "Geçersiz kayıt bilgileri.");
    }
    throw error;
  }
});

router.post("/forgot-password", async (req: Request, res: Response) => {
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
      throw new ValidationError(error.errors[0]?.message || "Geçersiz e-posta adresi.");
    }
    throw error;
  }
});

router.post("/reset-password", async (req: Request, res: Response) => {
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
      throw new ValidationError(error.errors[0]?.message || "Geçersiz bilgiler.");
    }
    throw error;
  }
});

router.post("/logout", async (req: AuthenticatedRequest, res: Response) => {
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
    throw error;
  }
});

export default router;

