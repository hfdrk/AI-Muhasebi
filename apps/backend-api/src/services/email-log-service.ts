/**
 * Email Log Service
 * 
 * Handles email delivery tracking and analytics
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

export interface EmailAnalytics {
  total: number;
  sent: number;
  delivered: number;
  bounced: number;
  failed: number;
  deliveryRate: number; // percentage
  bounceRate: number; // percentage
  failureRate: number; // percentage
  openedCount: number;
  clickedCount: number;
  openRate: number; // percentage (of delivered)
  clickRate: number; // percentage (of delivered)
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
  }

  /**
   * Update email delivery status
   */
  async updateEmailStatus(
    emailLogId: string,
    status: "sent" | "delivered" | "bounced" | "failed",
    options?: {
      messageId?: string;
      error?: string;
      openedAt?: Date;
      clickedAt?: Date;
      bouncedAt?: Date;
    }
  ): Promise<EmailLog> {
    const updateData: any = {
      status,
    };

    if (options?.messageId) {
      updateData.messageId = options.messageId;
    }
    if (options?.error) {
      updateData.error = options.error;
    }
    if (options?.openedAt) {
      updateData.openedAt = options.openedAt;
    }
    if (options?.clickedAt) {
      updateData.clickedAt = options.clickedAt;
    }
    if (options?.bouncedAt) {
      updateData.bouncedAt = options.bouncedAt;
    }

    const emailLog = await prisma.emailLog.update({
      where: { id: emailLogId },
      data: updateData,
    });

    return this.mapToEmailLog(emailLog);
  }

  /**
   * Get email logs with filters
   */
  async getEmailLogs(
    tenantId: string,
    filters: {
      status?: "sent" | "delivered" | "bounced" | "failed";
      dateFrom?: Date;
      dateTo?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    data: EmailLog[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const where: any = {
      tenantId,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.createdAt.lte = filters.dateTo;
      }
    }

    const [data, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.emailLog.count({ where }),
    ]);

    return {
      data: data.map((log) => this.mapToEmailLog(log)),
      total,
      limit,
      offset,
    };
  }

  /**
   * Get email analytics
   */
  async getEmailAnalytics(
    tenantId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<EmailAnalytics> {
    const where: any = {
      tenantId,
    };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = dateFrom;
      }
      if (dateTo) {
        where.createdAt.lte = dateTo;
      }
    }

    const [total, sent, delivered, bounced, failed, openedCount, clickedCount] = await Promise.all([
      prisma.emailLog.count({ where }),
      prisma.emailLog.count({ where: { ...where, status: "sent" } }),
      prisma.emailLog.count({ where: { ...where, status: "delivered" } }),
      prisma.emailLog.count({ where: { ...where, status: "bounced" } }),
      prisma.emailLog.count({ where: { ...where, status: "failed" } }),
      prisma.emailLog.count({ where: { ...where, openedAt: { not: null } } }),
      prisma.emailLog.count({ where: { ...where, clickedAt: { not: null } } }),
    ]);

    const deliveryRate = total > 0 ? (delivered / total) * 100 : 0;
    const bounceRate = total > 0 ? (bounced / total) * 100 : 0;
    const failureRate = total > 0 ? (failed / total) * 100 : 0;
    const openRate = delivered > 0 ? (openedCount / delivered) * 100 : 0;
    const clickRate = delivered > 0 ? (clickedCount / delivered) * 100 : 0;

    return {
      total,
      sent,
      delivered,
      bounced,
      failed,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      bounceRate: Math.round(bounceRate * 100) / 100,
      failureRate: Math.round(failureRate * 100) / 100,
      openedCount,
      clickedCount,
      openRate: Math.round(openRate * 100) / 100,
      clickRate: Math.round(clickRate * 100) / 100,
    };
  }

  /**
   * Get a single email log by ID
   */
  async getEmailLog(emailLogId: string, tenantId: string): Promise<EmailLog | null> {
    const emailLog = await prisma.emailLog.findFirst({
      where: {
        id: emailLogId,
        tenantId,
      },
    });

    if (!emailLog) {
      return null;
    }

    return this.mapToEmailLog(emailLog);
  }

  private mapToEmailLog(emailLog: any): EmailLog {
    return {
      id: emailLog.id,
      tenantId: emailLog.tenantId,
      to: emailLog.to,
      subject: emailLog.subject,
      status: emailLog.status as "sent" | "delivered" | "bounced" | "failed",
      messageId: emailLog.messageId,
      error: emailLog.error,
      openedAt: emailLog.openedAt,
      clickedAt: emailLog.clickedAt,
      bouncedAt: emailLog.bouncedAt,
      createdAt: emailLog.createdAt,
      updatedAt: emailLog.updatedAt,
    };
  }
}

export const emailLogService = new EmailLogService();


