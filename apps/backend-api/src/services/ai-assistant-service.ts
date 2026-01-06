import { prisma } from "../lib/prisma";
import { createLLMClient, hasRealAIProvider, logger } from "@repo/shared-utils";
import { getConfig } from "@repo/config";
import { auditService } from "./audit-service";
import { ragService } from "./rag-service";

export type AIAssistantType = "CHAT" | "DAILY_RISK_SUMMARY" | "PORTFOLIO_OVERVIEW";

export interface ChatContextFilters {
  type?: "GENEL" | "RAPOR" | "RISK";
  dateRange?: { from: Date; to: Date };
  companyId?: string;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface EnhancedChatInput {
  tenantId: string;
  userId: string;
  question: string;
  type?: "GENEL" | "RAPOR" | "RISK";
  contextFilters?: ChatContextFilters;
  conversationHistory?: ConversationMessage[];
  useHybridSearch?: boolean;
  useReranking?: boolean;
}

export class AIAssistantService {
  private _llmClient: ReturnType<typeof createLLMClient> | null = null;
  
  private get llmClient() {
    if (!this._llmClient) {
      this._llmClient = createLLMClient();
      // Log which client is being used (without exposing API keys)
      const clientType = this._llmClient.constructor.name;
      logger.info(`[AI Assistant] Using LLM client: ${clientType}`);
      if (clientType === "MockLLMClient") {
        logger.warn("[AI Assistant] WARNING: Using MockLLMClient. Set OPENAI_API_KEY or ANTHROPIC_API_KEY to use real AI.");
      }
    }
    return this._llmClient;
  }

  /**
   * Generate a chat response based on user question and tenant data
   */
  async generateChatResponse(input: {
    tenantId: string;
    userId: string;
    question: string;
    type?: "GENEL" | "RAPOR" | "RISK";
    contextFilters?: ChatContextFilters;
  }): Promise<string> {
    const { tenantId, userId, question, type, contextFilters } = input;

    // Fetch relevant data using RAG (semantic search) + keyword fallback
    const contextData = await this.retrieveRAGContext(tenantId, question, type, contextFilters);

    // Build system prompt
    const systemPrompt = `Sen bir muhasebe asistanısın. Türkçe yanıt ver. Kullanıcının muhasebe ofisindeki verileri hakkında sorularına yanıt veriyorsun.
Veriler sadece bu kiracıya (tenant) ait. Asla başka kiracıların verilerinden bahsetme.
Yanıtlarını Türkçe, profesyonel ve yardımcı bir tonla ver.`;

    // Build user prompt with context
    const userPrompt = this.buildChatPrompt(question, contextData, type);

    try {
      // Ensure LLM client is initialized
      if (!this.llmClient) {
        throw new Error("LLM client is not initialized");
      }
      
      const answer = await this.llmClient.generateText({
        systemPrompt,
        userPrompt,
        maxTokens: 2000,
      });

      // Log audit
      try {
        await auditService.log({
          tenantId,
          userId,
          action: "AI_CHAT",
          resourceType: "AI_ASSISTANT",
          resourceId: null,
          metadata: {
            type: type || "GENEL",
            filters: contextFilters || {},
            hasRealAIProvider: hasRealAIProvider(),
            questionLength: question.length,
          },
        });
      } catch (auditError: any) {
        // Don't fail the request if audit logging fails
        logger.error("Audit logging failed:", { error: auditError.message });
      }

      return answer;
    } catch (error: any) {
      // Log the actual error for debugging
      logger.error("[AI Assistant] Error generating chat response:", {
        error: error.message,
        stack: error.stack,
        tenantId,
        userId,
        questionLength: question.length,
      });
      
      // Log error but don't expose internal details
      try {
        await auditService.log({
          tenantId,
          userId,
          action: "AI_CHAT",
          resourceType: "AI_ASSISTANT",
          resourceId: null,
          metadata: {
            type: type || "GENEL",
            error: "AI yanıtı oluşturulamadı",
            errorMessage: error.message?.substring(0, 100), // Log first 100 chars for debugging
            hasRealAIProvider: hasRealAIProvider(),
          },
        });
      } catch (auditError: any) {
        // Don't fail if audit logging fails
        logger.error("Audit logging failed:", { error: auditError.message });
      }

      // Re-throw with user-friendly message
      throw new Error(`AI yanıtı oluşturulurken bir hata oluştu: ${error.message}`);
    }
  }

  /**
   * Generate daily risk summary
   */
  async generateDailyRiskSummary(input: {
    tenantId: string;
    userId: string;
    date?: Date;
  }): Promise<string> {
    const { tenantId, userId, date = new Date() } = input;

    // Get start and end of day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch risk alerts for the day
    const riskAlerts = await prisma.riskAlert.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        clientCompany: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        severity: "desc",
      },
    });

    // Get risk scores
    const riskScores = await prisma.clientCompanyRiskScore.findMany({
      where: {
        tenantId,
        updatedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        clientCompany: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Build prompt
    const systemPrompt = `Sen bir muhasebe risk analiz uzmanısın. Türkçe yanıt ver. Günlük risk özetleri oluşturuyorsun.
Özetler profesyonel, özlü ve eylem odaklı olmalı.`;

    const userPrompt = this.buildDailyRiskSummaryPrompt(riskAlerts, riskScores, date);

    try {
      const summary = await this.llmClient.generateText({
        systemPrompt,
        userPrompt,
        maxTokens: 1500,
      });

      // Log audit
      await auditService.log({
        tenantId,
        userId,
        action: "AI_SUMMARY_DAILY_RISK",
        resourceType: "AI_ASSISTANT",
        resourceId: null,
        metadata: {
          date: date.toISOString(),
          alertCount: riskAlerts.length,
          hasRealAIProvider: hasRealAIProvider(),
        },
      });

      return summary;
    } catch (error: any) {
      // Log the actual error for debugging
      logger.error("[AI Assistant] Error generating daily risk summary:", { error });
      
      await auditService.log({
        tenantId,
        userId,
        action: "AI_SUMMARY_DAILY_RISK",
        resourceType: "AI_ASSISTANT",
        resourceId: null,
        metadata: {
          date: date.toISOString(),
          error: error?.message || "Özet oluşturulamadı",
          errorType: error?.constructor?.name,
          hasRealAIProvider: hasRealAIProvider(),
        },
      });

      // Provide more helpful error message
      const errorMessage = error?.message || "Bilinmeyen hata";
      throw new Error(`Risk özeti oluşturulurken bir hata oluştu: ${errorMessage}. Lütfen daha sonra tekrar deneyin.`);
    }
  }

  /**
   * Generate portfolio overview
   */
  async generatePortfolioOverview(input: {
    tenantId: string;
    userId: string;
  }): Promise<string> {
    const { tenantId, userId } = input;

    // Fetch client companies with risk scores
    const companies = await prisma.clientCompany.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      include: {
        riskScores: {
          orderBy: {
            updatedAt: "desc",
          },
          take: 1,
        },
      },
    });

    // Get risk alerts summary
    const riskAlertsSummary = await prisma.riskAlert.groupBy({
      by: ["severity"],
      where: {
        tenantId,
        status: "open",
      },
      _count: {
        id: true,
      },
    });

    // Get basic stats
    const [totalInvoices, totalTransactions, totalDocuments] = await Promise.all([
      prisma.invoice.count({
        where: { tenantId },
      }),
      prisma.transaction.count({
        where: { tenantId },
      }),
      prisma.document.count({
        where: { tenantId },
      }),
    ]);

    // Build prompt
    const systemPrompt = `Sen bir muhasebe portföy analiz uzmanısın. Türkçe yanıt ver. Müşteri portföyü özetleri oluşturuyorsun.
Özetler profesyonel, kapsamlı ve stratejik olmalı.`;

    const userPrompt = this.buildPortfolioOverviewPrompt(
      companies,
      riskAlertsSummary,
      totalInvoices,
      totalTransactions,
      totalDocuments
    );

    try {
      const summary = await this.llmClient.generateText({
        systemPrompt,
        userPrompt,
        maxTokens: 2000,
      });

      // Log audit
      await auditService.log({
        tenantId,
        userId,
        action: "AI_SUMMARY_PORTFOLIO",
        resourceType: "AI_ASSISTANT",
        resourceId: null,
        metadata: {
          companyCount: companies.length,
          hasRealAIProvider: hasRealAIProvider(),
        },
      });

      return summary;
    } catch (error: any) {
      // Log the actual error for debugging
      logger.error("[AI Assistant] Error generating portfolio overview:", { error });
      
      await auditService.log({
        tenantId,
        userId,
        action: "AI_SUMMARY_PORTFOLIO",
        resourceType: "AI_ASSISTANT",
        resourceId: null,
        metadata: {
          error: error?.message || "Özet oluşturulamadı",
          errorType: error?.constructor?.name,
          hasRealAIProvider: hasRealAIProvider(),
        },
      });

      // Provide more helpful error message
      const errorMessage = error?.message || "Bilinmeyen hata";
      throw new Error(`Portföy özeti oluşturulurken bir hata oluştu: ${errorMessage}. Lütfen daha sonra tekrar deneyin.`);
    }
  }

  /**
   * Retrieve context using RAG (Retrieval Augmented Generation)
   * Uses semantic search to find relevant documents, then supplements with keyword-based queries
   */
  private async retrieveRAGContext(
    tenantId: string,
    question: string,
    type?: "GENEL" | "RAPOR" | "RISK",
    filters?: ChatContextFilters
  ): Promise<any> {
    const context: any = {};
    const config = getConfig();

    try {
      // Check if RAG is enabled before using it
      if (!config.RAG_ENABLED) {
        logger.debug("RAG is disabled, skipping semantic search", { tenantId });
        // Continue to keyword-based fallback below
      } else {
        // Use RAG to find semantically similar documents
        const ragContext = await ragService.retrieveContext(question, tenantId, {
          topK: 5,
          includeMetadata: true,
          filters: {
            clientCompanyId: filters?.companyId,
            documentType: type === "RAPOR" ? "INVOICE" : undefined,
            dateRange: filters?.dateRange,
          },
        });

        // Add RAG-retrieved documents to context
        if (ragContext.documents.length > 0) {
          context.ragDocuments = ragContext.documents.map((doc) => ({
            id: doc.documentId,
            text: doc.text,
            similarity: doc.similarity,
            type: doc.metadata?.type,
            clientCompanyId: doc.metadata?.clientCompanyId,
          }));
        }
      }
    } catch (ragError: any) {
      // Log but continue with keyword-based fallback
      logger.warn("RAG retrieval failed, using keyword fallback", { tenantId }, {
        error: ragError.message,
        questionLength: question.length,
      });
    }

    // Supplement with keyword-based queries for structured data
    const questionLower = question.toLowerCase();

    // Risk-related questions
    if (type === "RISK" || questionLower.includes("risk") || questionLower.includes("uyarı")) {
      const where: any = { tenantId };
      if (filters?.companyId) {
        where.clientCompanyId = filters.companyId;
      }
      if (filters?.dateRange) {
        where.createdAt = {
          gte: filters.dateRange.from,
          lte: filters.dateRange.to,
        };
      }

      context.riskAlerts = await prisma.riskAlert.findMany({
        where,
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          clientCompany: {
            select: { id: true, name: true },
          },
        },
      });
    }

    // Invoice-related questions
    if (type === "RAPOR" || questionLower.includes("fatura") || questionLower.includes("invoice")) {
      const where: any = { tenantId };
      if (filters?.companyId) {
        where.clientCompanyId = filters.companyId;
      }
      if (filters?.dateRange) {
        where.createdAt = {
          gte: filters.dateRange.from,
          lte: filters.dateRange.to,
        };
      }

      context.invoices = await prisma.invoice.findMany({
        where,
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          clientCompany: {
            select: { id: true, name: true },
          },
        },
      });
    }

    // Company-related questions
    if (questionLower.includes("müşteri") || questionLower.includes("şirket") || questionLower.includes("company")) {
      const where: any = { tenantId, isActive: true };
      if (filters?.companyId) {
        where.id = filters.companyId;
      }

      context.companies = await prisma.clientCompany.findMany({
        where,
        take: 10,
        include: {
          riskScores: {
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
        },
      });
    }

    return context;
  }

  /**
   * Build enhanced chat prompt with RAG context
   */
  private buildChatPrompt(question: string, contextData: any, type?: string): string {
    let prompt = `Kullanıcı sorusu: ${question}\n\n`;

    // Add RAG-retrieved documents first (most relevant)
    if (contextData.ragDocuments && contextData.ragDocuments.length > 0) {
      prompt += "İlgili Belgeler (Semantik Arama Sonuçları):\n";
      contextData.ragDocuments.forEach((doc: any, index: number) => {
        prompt += `${index + 1}. Belge ID: ${doc.id} (Benzerlik: ${(doc.similarity * 100).toFixed(1)}%)\n`;
        if (doc.text) {
          prompt += `   İçerik: ${doc.text.substring(0, 500)}${doc.text.length > 500 ? "..." : ""}\n`;
        }
        if (doc.type) {
          prompt += `   Tip: ${doc.type}\n`;
        }
      });
      prompt += "\n";
    }

    // Add structured data (risk alerts, invoices, companies)
    if (contextData.riskAlerts && contextData.riskAlerts.length > 0) {
      prompt += "Risk Uyarıları:\n";
      contextData.riskAlerts.forEach((alert: any) => {
        prompt += `- ${alert.title} (${alert.severity}): ${alert.message}\n`;
        if (alert.clientCompany) {
          prompt += `  Şirket: ${alert.clientCompany.name}\n`;
        }
      });
      prompt += "\n";
    }

    if (contextData.invoices && contextData.invoices.length > 0) {
      prompt += "Son Faturalar:\n";
      contextData.invoices.forEach((invoice: any) => {
        prompt += `- ${invoice.invoiceNumber}: ${invoice.totalAmount} ${invoice.currency}\n`;
        if (invoice.clientCompany) {
          prompt += `  Şirket: ${invoice.clientCompany.name}\n`;
        }
      });
      prompt += "\n";
    }

    if (contextData.companies && contextData.companies.length > 0) {
      prompt += "Müşteri Şirketleri:\n";
      contextData.companies.forEach((company: any) => {
        prompt += `- ${company.name} (${company.taxNumber})\n`;
        if (company.riskScores && company.riskScores.length > 0) {
          const score = company.riskScores[0];
          prompt += `  Risk Skoru: ${score.overallScore}\n`;
        }
      });
      prompt += "\n";
    }

    prompt += "Yukarıdaki verilere dayanarak kullanıcının sorusuna Türkçe yanıt ver. ";
    prompt += "İlgili belgelerden (semantik arama sonuçları) gelen bilgileri öncelikli olarak kullan.";

    return prompt;
  }

  /**
   * Build daily risk summary prompt
   */
  private buildDailyRiskSummaryPrompt(riskAlerts: any[], riskScores: any[], date: Date): string {
    const dateStr = date.toLocaleDateString("tr-TR");

    let prompt = `${dateStr} tarihi için risk özeti oluştur.\n\n`;

    if (riskAlerts.length === 0 && riskScores.length === 0) {
      prompt += "Bu tarihte yeni risk uyarısı veya risk skoru güncellemesi yok.";
      return prompt;
    }

    if (riskAlerts.length > 0) {
      prompt += `Risk Uyarıları (${riskAlerts.length} adet):\n`;
      riskAlerts.forEach((alert) => {
        prompt += `- ${alert.severity.toUpperCase()}: ${alert.title}\n`;
        prompt += `  ${alert.message}\n`;
        if (alert.clientCompany) {
          prompt += `  Şirket: ${alert.clientCompany.name}\n`;
        }
        prompt += "\n";
      });
    }

    if (riskScores.length > 0) {
      prompt += `Risk Skoru Güncellemeleri (${riskScores.length} adet):\n`;
      riskScores.forEach((score) => {
        prompt += `- ${score.clientCompany.name}: Risk Skoru ${score.overallScore}\n`;
      });
      prompt += "\n";
    }

    prompt += "Yukarıdaki verilere dayanarak günlük risk özeti oluştur. Önemli noktaları vurgula ve gerekli eylemleri öner.";

    return prompt;
  }

  /**
   * Build portfolio overview prompt
   */
  private buildPortfolioOverviewPrompt(
    companies: any[],
    riskAlertsSummary: any[],
    totalInvoices: number,
    totalTransactions: number,
    totalDocuments: number
  ): string {
    let prompt = "Müşteri portföyü özeti oluştur.\n\n";

    prompt += `Toplam Aktif Müşteri: ${companies.length}\n`;
    prompt += `Toplam Fatura: ${totalInvoices}\n`;
    prompt += `Toplam İşlem: ${totalTransactions}\n`;
    prompt += `Toplam Belge: ${totalDocuments}\n\n`;

    if (riskAlertsSummary.length > 0) {
      prompt += "Açık Risk Uyarıları:\n";
      riskAlertsSummary.forEach((group) => {
        prompt += `- ${group.severity.toUpperCase()}: ${group._count.id} adet\n`;
      });
      prompt += "\n";
    }

    // Risk distribution
    const highRiskCompanies = companies.filter((c) => {
      const score = c.riskScores[0];
      return score && score.overallScore >= 70;
    });

    const mediumRiskCompanies = companies.filter((c) => {
      const score = c.riskScores[0];
      return score && score.overallScore >= 40 && score.overallScore < 70;
    });

    const lowRiskCompanies = companies.filter((c) => {
      const score = c.riskScores[0];
      return !score || score.overallScore < 40;
    });

    prompt += "Risk Dağılımı:\n";
    prompt += `- Yüksek Risk (≥70): ${highRiskCompanies.length} şirket\n`;
    prompt += `- Orta Risk (40-69): ${mediumRiskCompanies.length} şirket\n`;
    prompt += `- Düşük Risk (<40): ${lowRiskCompanies.length} şirket\n\n`;

    if (highRiskCompanies.length > 0) {
      prompt += "Yüksek Riskli Şirketler:\n";
      highRiskCompanies.slice(0, 5).forEach((company) => {
        const score = company.riskScores[0];
        prompt += `- ${company.name}: Risk Skoru ${score?.overallScore || "N/A"}\n`;
      });
      prompt += "\n";
    }

    prompt += "Yukarıdaki verilere dayanarak kapsamlı bir portföy özeti oluştur. Risk dağılımını, önemli trendleri ve önerileri içer.";

    return prompt;
  }

  /**
   * Generate text using LLM (simple wrapper)
   */
  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const answer = await this.llmClient.generateText({
        systemPrompt: systemPrompt || "Sen bir muhasebe asistanısın. Türkçe yanıt ver.",
        userPrompt: prompt,
        maxTokens: 1000,
      });
      return answer;
    } catch (error: any) {
      logger.error("[AI Assistant] Error generating text:", { error });
      throw error;
    }
  }

  /**
   * Enhanced chat response with multi-turn conversation, hybrid search, and re-ranking
   */
  async generateEnhancedChatResponse(input: EnhancedChatInput): Promise<{
    answer: string;
    sourcesUsed: Array<{
      documentId: string;
      similarity: number;
      rerankScore?: number;
    }>;
    searchMetrics: {
      hybridResultsCount?: number;
      ragDocumentsUsed: number;
      processingTimeMs: number;
    };
  }> {
    const startTime = Date.now();
    const {
      tenantId,
      userId,
      question,
      type,
      contextFilters,
      conversationHistory,
      useHybridSearch = true,
      useReranking = false,
    } = input;

    try {
      // Use enhanced RAG context retrieval
      const ragContext = await ragService.retrieveEnhancedContext(question, tenantId, {
        topK: 5,
        includeMetadata: true,
        useHybridSearch,
        useReranking,
        conversationHistory,
        filters: {
          clientCompanyId: contextFilters?.companyId,
          documentType: type === "RAPOR" ? "INVOICE" : undefined,
          dateRange: contextFilters?.dateRange,
        },
      });

      // Fetch additional structured data (risk alerts, invoices, companies)
      const structuredContext = await this.retrieveRAGContext(tenantId, question, type, contextFilters);

      // Merge RAG documents with structured context
      const mergedContext = {
        ...structuredContext,
        ragDocuments: ragContext.documents.map((doc) => ({
          id: doc.documentId,
          text: doc.text,
          similarity: doc.similarity,
          rerankScore: doc.rerankScore,
          type: doc.metadata?.type,
          clientCompanyId: doc.metadata?.clientCompanyId,
        })),
      };

      // Build system prompt with conversation context
      let systemPrompt = `Sen bir muhasebe asistanısın. Türkçe yanıt ver. Kullanıcının muhasebe ofisindeki verileri hakkında sorularına yanıt veriyorsun.
Veriler sadece bu kiracıya (tenant) ait. Asla başka kiracıların verilerinden bahsetme.
Yanıtlarını Türkçe, profesyonel ve yardımcı bir tonla ver.`;

      // Add conversation history context
      if (conversationHistory && conversationHistory.length > 0) {
        systemPrompt += `\n\nKonuşma geçmişi mevcut. Önceki mesajları dikkate al ve tutarlı bir şekilde yanıt ver.`;
      }

      // Build user prompt with all context
      const userPrompt = this.buildEnhancedChatPrompt(question, mergedContext, type, conversationHistory);

      const answer = await this.llmClient.generateText({
        systemPrompt,
        userPrompt,
        maxTokens: 2000,
      });

      const processingTimeMs = Date.now() - startTime;

      // Log audit
      try {
        await auditService.log({
          tenantId,
          userId,
          action: "AI_CHAT_ENHANCED",
          resourceType: "AI_ASSISTANT",
          resourceId: null,
          metadata: {
            type: type || "GENEL",
            filters: contextFilters || {},
            useHybridSearch,
            useReranking,
            conversationHistoryLength: conversationHistory?.length || 0,
            ragDocumentsUsed: ragContext.documents.length,
            processingTimeMs,
            hasRealAIProvider: hasRealAIProvider(),
          },
        });
      } catch (auditError: any) {
        logger.error("Audit logging failed:", { error: auditError.message });
      }

      return {
        answer,
        sourcesUsed: ragContext.documents.map((doc) => ({
          documentId: doc.documentId,
          similarity: doc.similarity,
          rerankScore: doc.rerankScore,
        })),
        searchMetrics: {
          hybridResultsCount: ragContext.hybridResults,
          ragDocumentsUsed: ragContext.documents.length,
          processingTimeMs,
        },
      };
    } catch (error: any) {
      const processingTimeMs = Date.now() - startTime;
      logger.error("[AI Assistant] Error generating enhanced chat response:", {
        error: error.message,
        stack: error.stack,
        tenantId,
        userId,
        processingTimeMs,
      });

      throw new Error(`AI yanıtı oluşturulurken bir hata oluştu: ${error.message}`);
    }
  }

  /**
   * Build enhanced chat prompt with conversation history
   */
  private buildEnhancedChatPrompt(
    question: string,
    contextData: any,
    type?: string,
    conversationHistory?: ConversationMessage[]
  ): string {
    let prompt = "";

    // Add conversation history if available
    if (conversationHistory && conversationHistory.length > 0) {
      prompt += "Önceki Konuşma:\n";
      conversationHistory.slice(-6).forEach((msg) => {
        const role = msg.role === "user" ? "Kullanıcı" : "Asistan";
        prompt += `${role}: ${msg.content.substring(0, 300)}${msg.content.length > 300 ? "..." : ""}\n`;
      });
      prompt += "\n---\n\n";
    }

    prompt += `Mevcut Soru: ${question}\n\n`;

    // Add RAG-retrieved documents first (most relevant)
    if (contextData.ragDocuments && contextData.ragDocuments.length > 0) {
      prompt += "İlgili Belgeler (Akıllı Arama Sonuçları):\n";
      contextData.ragDocuments.forEach((doc: any, index: number) => {
        const scoreInfo = doc.rerankScore !== undefined
          ? `Alaka: ${doc.rerankScore}/10`
          : `Benzerlik: ${(doc.similarity * 100).toFixed(1)}%`;

        prompt += `${index + 1}. Belge ID: ${doc.id} (${scoreInfo})\n`;
        if (doc.text) {
          prompt += `   İçerik: ${doc.text.substring(0, 400)}${doc.text.length > 400 ? "..." : ""}\n`;
        }
        if (doc.type) {
          prompt += `   Tip: ${doc.type}\n`;
        }
      });
      prompt += "\n";
    }

    // Add structured data (risk alerts, invoices, companies) - same as before
    if (contextData.riskAlerts && contextData.riskAlerts.length > 0) {
      prompt += "Risk Uyarıları:\n";
      contextData.riskAlerts.forEach((alert: any) => {
        prompt += `- ${alert.title} (${alert.severity}): ${alert.message}\n`;
        if (alert.clientCompany) {
          prompt += `  Şirket: ${alert.clientCompany.name}\n`;
        }
      });
      prompt += "\n";
    }

    if (contextData.invoices && contextData.invoices.length > 0) {
      prompt += "Son Faturalar:\n";
      contextData.invoices.forEach((invoice: any) => {
        prompt += `- ${invoice.invoiceNumber}: ${invoice.totalAmount} ${invoice.currency}\n`;
        if (invoice.clientCompany) {
          prompt += `  Şirket: ${invoice.clientCompany.name}\n`;
        }
      });
      prompt += "\n";
    }

    if (contextData.companies && contextData.companies.length > 0) {
      prompt += "Müşteri Şirketleri:\n";
      contextData.companies.forEach((company: any) => {
        prompt += `- ${company.name} (${company.taxNumber})\n`;
        if (company.riskScores && company.riskScores.length > 0) {
          const score = company.riskScores[0];
          prompt += `  Risk Skoru: ${score.overallScore}\n`;
        }
      });
      prompt += "\n";
    }

    prompt += "Yukarıdaki verilere ve konuşma geçmişine dayanarak kullanıcının sorusuna Türkçe yanıt ver. ";
    prompt += "İlgili belgelerden (akıllı arama sonuçları) gelen bilgileri öncelikli olarak kullan. ";
    prompt += "Yanıtında hangi kaynakları kullandığını belirtmene gerek yok.";

    return prompt;
  }
}

export const aiAssistantService = new AIAssistantService();

