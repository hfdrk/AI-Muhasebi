/**
 * Email Service - Stub Implementation for Notifications
 *
 * TODO: Replace with real email provider integration:
 * - SMTP (nodemailer)
 * - SendGrid
 * - AWS SES
 * - Mailgun
 * - Or other email service provider
 */
export interface SendEmailParams {
    to: string[];
    subject: string;
    body: string;
}
export declare class EmailService {
    /**
     * Send email
     *
     * For now, this is a stub that logs the email details.
     * In production, this should integrate with a real email provider.
     */
    sendEmail(params: SendEmailParams): Promise<void>;
    /**
     * Send notification email
     */
    sendNotificationEmail(to: string[], notificationType: string, title: string, message: string): Promise<void>;
}
export declare const emailService: EmailService;
//# sourceMappingURL=email-service.d.ts.map