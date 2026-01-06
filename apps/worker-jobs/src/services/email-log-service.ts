/**
 * Email Log Service for Worker Jobs
 * 
 * Handles email delivery tracking using Prisma
 */

import { prisma } from "../lib/prisma";

export interface EmailLog {
  id: string;
  tenantId: string | null;
  to: string[];
  subject: string;
  status: "sent" | "delivered" | "bounced" | "failed";
  messageId: string | null;
  error: string | null;
  openedAt: Date | null;
  clickedAt: Date | null;
  bouncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class EmailLogService {
  /**
   * Log an email send attempt
   */
  async logEmail(params: {
    tenantId?: string | null;
    to: string[];
    subject: string;
    status: "sent" | "delivered" | "bounced" | "failed";
    messageId?: string | null;
    error?: string | null;
  }): Promise<EmailLog> {
    try {
      const emailLog = await prisma.emailLog.create({
        data: {
          tenantId: params.tenantId || null,
          to: params.to,
          subject: params.subject,
          status: params.status,
          messageId: params.messageId || null,
          error: params.error || null,
        },
      });

      return this.mapToEmailLog(emailLog);
    } catch (error: any) {
      // Don't fail if logging fails
      console.error("[EmailLogService] Failed to log email:", error.message);
      throw error;
    }
  }

  private mapToEmailLog(data: any): EmailLog {
    return {
      id: data.id,
      tenantId: data.tenantId,
      to: data.to,
      subject: data.subject,
      status: data.status,
      messageId: data.messageId,
      error: data.error,
      openedAt: data.openedAt,
      clickedAt: data.clickedAt,
      bouncedAt: data.bouncedAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}

export const emailLogService = new EmailLogService();

