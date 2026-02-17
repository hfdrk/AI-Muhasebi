/**
 * Email Service - Production Implementation with SMTP
 *
 * Supports:
 * - SMTP via nodemailer (configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD)
 * - Stub mode for development/testing (set EMAIL_TRANSPORT=stub)
 * - Retry logic with exponential backoff
 * - Email logging via emailLogService
 * - Template support via emailTemplateService
 * - Retry queue for failed emails
 */
export interface SendEmailParams {
    to: string[];
    subject: string;
    body: string;
    html?: string;
    cc?: string[];
    bcc?: string[];
    tenantId?: string | null;
}
export declare class EmailService {
    sendEmail(params: SendEmailParams, retries?: number): Promise<void>;
    sendNotificationEmail(to: string[], notificationType: string, title: string, message: string, details?: string, tenantId?: string | null): Promise<void>;
    sendTemplatedEmail(templateName: string, to: string[], subject: string, variables: Record<string, any>, tenantId?: string | null): Promise<void>;
    verifyConnection(): Promise<boolean>;
}
export declare const emailService: EmailService;
