/**
 * Email Service - Real Implementation with Multiple Providers
 * 
 * Supports:
 * - SMTP (nodemailer)
 * - SendGrid (future)
 * - AWS SES (future)
 * - Mailgun (future)
 * - Stub mode for development/testing
 */

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { getConfig } from "@repo/config";
import { emailTemplateService, type TemplateVariables } from "./email-template-service";

export interface SendEmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface SendEmailParams {
  to: string[];
  subject: string;
  body: string;
  html?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: SendEmailAttachment[];
}

export class EmailService {
  private transporter: Transporter | null = null;
  private transportType: string;
  private fromEmail: string;

  constructor() {
    const config = getConfig();
    this.transportType = config.EMAIL_TRANSPORT;
    this.fromEmail = config.SMTP_FROM || config.EMAIL_FROM_DEFAULT || "noreply@example.com";

    if (this.transportType === "smtp") {
      this.initializeSMTP();
    }
  }

  private initializeSMTP(): void {
    const config = getConfig();

    if (!config.SMTP_HOST) {
      console.warn(
        "[EmailService] SMTP_HOST not configured. Email sending will be disabled. Set EMAIL_TRANSPORT=stub to suppress this warning."
      );
      return;
    }

    const smtpConfig: nodemailer.TransportOptions = {
      host: config.SMTP_HOST,
      port: config.SMTP_PORT || 587,
      secure: config.SMTP_SECURE,
      auth: config.SMTP_USER && config.SMTP_PASSWORD
        ? {
            user: config.SMTP_USER,
            pass: config.SMTP_PASSWORD,
          }
        : undefined,
    };

    this.transporter = nodemailer.createTransport(smtpConfig);
  }

  /**
   * Send email with retry logic and attachment support
   */
  async sendEmail(params: SendEmailParams, retries = 3): Promise<void> {
    const { to, subject, body, html, cc, bcc, attachments } = params;

    // Validate recipients
    if (!to || to.length === 0) {
      throw new Error("Email must have at least one recipient");
    }

    // Stub mode - just log
    if (this.transportType === "stub") {
      console.log("[EmailService] [STUB MODE] Would send email:", {
        to,
        subject,
        bodyLength: body.length,
        htmlLength: html?.length || 0,
        attachmentCount: attachments?.length || 0,
        attachmentFilenames: attachments?.map((a) => a.filename) || [],
        cc,
        bcc,
      });
      return;
    }

    // Check if transporter is initialized
    if (!this.transporter) {
      if (this.transportType === "smtp") {
        throw new Error(
          "SMTP transporter not initialized. Please check SMTP configuration (SMTP_HOST, SMTP_PORT, etc.)"
        );
      }
      // For other providers (future), throw appropriate error
      throw new Error(`Email transport "${this.transportType}" is not yet implemented`);
    }

    // Send email with retry logic
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const mailOptions = {
          from: this.fromEmail,
          to: to.join(", "),
          cc: cc?.join(", "),
          bcc: bcc?.join(", "),
          subject,
          text: body,
          html: html || body.replace(/\n/g, "<br>"), // Simple HTML conversion if no HTML provided
          attachments: attachments?.map((a) => ({
            filename: a.filename,
            content: a.content,
            contentType: a.contentType,
          })),
        };

        const info = await this.transporter.sendMail(mailOptions);

        console.log("[EmailService] Email sent successfully:", {
          messageId: info.messageId,
          to,
          subject,
          attachmentCount: attachments?.length || 0,
          attempt,
        });

        return; // Success, exit retry loop
      } catch (error: any) {
        lastError = error;
        console.error(`[EmailService] Email send attempt ${attempt}/${retries} failed:`, {
          error: error.message,
          to,
          subject,
        });

        // Don't retry on certain errors (e.g., invalid email address)
        if (error.code === "EENVELOPE" || error.responseCode === 550) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10 seconds
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed - add to retry queue
    try {
      const { retryQueueService } = await import("./retry-queue-service");
      await retryQueueService.enqueue(
        "email",
        {
          to,
          subject,
          body,
          html,
          cc,
          bcc,
          attachments: attachments?.map((a) => ({
            filename: a.filename,
            content: a.content.toString("base64"),
            contentType: a.contentType,
          })),
        },
        3, // max attempts
        60000 // 1 minute delay
      );
      console.log("[EmailService] Email queued for retry after all attempts failed");
    } catch (queueError: any) {
      console.error("[EmailService] Failed to queue email for retry:", queueError.message);
    }

    // Still throw error so caller knows it failed
    throw new Error(
      `Failed to send email after ${retries} attempts: ${lastError?.message || "Unknown error"}. Email has been queued for retry.`
    );
  }

  /**
   * Send templated email
   */
  async sendTemplatedEmail(
    templateName: string,
    to: string[],
    subject: string,
    variables: TemplateVariables
  ): Promise<void> {
    try {
      const html = await emailTemplateService.renderTemplate(templateName, variables);
      const body = await emailTemplateService.renderPlainText(templateName, variables);

      await this.sendEmail({
        to,
        subject,
        body,
        html,
      });
    } catch (error: any) {
      throw new Error(`Failed to send templated email: ${error.message}`);
    }
  }

  /**
   * Verify email configuration
   */
  async verifyConnection(): Promise<boolean> {
    if (this.transportType === "stub") {
      console.log("[EmailService] Stub mode - connection verification skipped");
      return true;
    }

    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      console.log("[EmailService] SMTP connection verified successfully");
      return true;
    } catch (error: any) {
      console.error("[EmailService] SMTP connection verification failed:", error.message);
      return false;
    }
  }
}

export const emailService = new EmailService();
