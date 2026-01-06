/**
 * Email Template Service
 * 
 * Handles email template rendering using Handlebars
 * Templates are stored in the templates/email/ directory
 */

// @ts-ignore - handlebars types may not be available
import Handlebars from "handlebars";
// @ts-ignore
import type { TemplateDelegate } from "handlebars";
import { readFileSync } from "fs";
import { join } from "path";

export interface TemplateVariables {
  [key: string]: any;
}

export class EmailTemplateService {
  private templateCache: Map<string, TemplateDelegate> = new Map();
  private templatesDir: string;

  constructor() {
    // Templates directory relative to backend-api root
    this.templatesDir = join(__dirname, "../../templates/email");
  }

  /**
   * Get template from cache or load from file
   */
  private getTemplate(templateName: string): TemplateDelegate {
    // Check cache first
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    // Load template from file
    const templatePath = join(this.templatesDir, `${templateName}.html`);
    let templateContent: string;

    try {
      templateContent = readFileSync(templatePath, "utf-8");
    } catch (error: any) {
      throw new Error(
        `Email template "${templateName}" not found at ${templatePath}: ${error.message}`
      );
    }

    // Compile template
    const template = Handlebars.compile(templateContent);

    // Cache it
    this.templateCache.set(templateName, template);

    return template;
  }

  /**
   * Render email template with variables
   */
  async renderTemplate(
    templateName: string,
    variables: TemplateVariables
  ): Promise<string> {
    const template = this.getTemplate(templateName);
    return template(variables);
  }

  /**
   * Render plain text version (strips HTML tags)
   */
  async renderPlainText(
    templateName: string,
    variables: TemplateVariables
  ): Promise<string> {
    const html = await this.renderTemplate(templateName, variables);
    // Simple HTML to text conversion
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .trim();
  }

  /**
   * Clear template cache (useful for development)
   */
  clearCache(): void {
    this.templateCache.clear();
  }
}

export const emailTemplateService = new EmailTemplateService();



