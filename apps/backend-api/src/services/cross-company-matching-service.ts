import { prisma } from "../lib/prisma";

export interface CrossCompanyMatch {
  type: "SAME_INVOICE_NUMBER" | "SAME_AMOUNT_COUNTERPARTY" | "CIRCULAR_INVOICE" | "MIRROR_TRANSACTION";
  severity: "low" | "medium" | "high";
  description: string;
  company1: { id: string; name: string };
  company2: { id: string; name: string };
  invoiceId1?: string;
  invoiceId2?: string;
  amount?: number;
  matchConfidence: number; // 0-1
}

export interface CrossCompanyMatchResult {
  totalMatches: number;
  matches: CrossCompanyMatch[];
  riskScore: number; // 0-100
  summary: string;
}

export class CrossCompanyMatchingService {
  /**
   * Scan all client companies in a tenant for cross-company invoice patterns
   */
  async scanTenant(tenantId: string): Promise<CrossCompanyMatchResult> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Get all client companies
    const companies = await prisma.clientCompany.findMany({
      where: { tenantId },
      select: { id: true, name: true, taxNumber: true },
    });

    if (companies.length < 2) {
      return { totalMatches: 0, matches: [], riskScore: 0, summary: "Karşılaştırma için en az 2 müşteri şirketi gerekli" };
    }

    // Get all invoices for the tenant in the time window
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        issueDate: { gte: sixMonthsAgo },
      },
      select: {
        id: true,
        clientCompanyId: true,
        externalId: true,
        counterpartyName: true,
        counterpartyTaxNumber: true,
        totalAmount: true,
        taxAmount: true,
        issueDate: true,
        type: true,
      },
    });

    const matches: CrossCompanyMatch[] = [];
    const companyMap = new Map(companies.map((c) => [c.id, c]));

    // CHECK 1: Same invoice number across different companies
    const invoiceNumberMap = new Map<string, Array<typeof invoices[0]>>();
    for (const inv of invoices) {
      const number = inv.externalId;
      if (!number) continue;
      const existing = invoiceNumberMap.get(number) || [];
      existing.push(inv);
      invoiceNumberMap.set(number, existing);
    }

    for (const [number, invGroup] of invoiceNumberMap.entries()) {
      // Check if same invoice number appears in different companies
      const companyIds = new Set(invGroup.map((inv) => inv.clientCompanyId));
      if (companyIds.size > 1) {
        const ids = [...companyIds];
        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            const c1 = companyMap.get(ids[i]);
            const c2 = companyMap.get(ids[j]);
            if (!c1 || !c2) continue;

            const inv1 = invGroup.find((inv) => inv.clientCompanyId === ids[i]);
            const inv2 = invGroup.find((inv) => inv.clientCompanyId === ids[j]);

            matches.push({
              type: "SAME_INVOICE_NUMBER",
              severity: "high",
              description: `Aynı fatura numarası (${number}) farklı şirketlerde tespit edildi: "${c1.name}" ve "${c2.name}"`,
              company1: { id: c1.id, name: c1.name },
              company2: { id: c2.id, name: c2.name },
              invoiceId1: inv1?.id,
              invoiceId2: inv2?.id,
              amount: Number(inv1?.totalAmount || 0),
              matchConfidence: 0.95,
            });
          }
        }
      }
    }

    // CHECK 2: Same amount + same counterparty across different companies within 7 days
    for (let i = 0; i < invoices.length; i++) {
      for (let j = i + 1; j < invoices.length; j++) {
        const inv1 = invoices[i];
        const inv2 = invoices[j];

        if (inv1.clientCompanyId === inv2.clientCompanyId) continue;
        if (!inv1.counterpartyName || !inv2.counterpartyName) continue;

        const sameAmount = Math.abs(Number(inv1.totalAmount) - Number(inv2.totalAmount)) < 0.01;
        const sameCounterparty = inv1.counterpartyName.toLowerCase() === inv2.counterpartyName.toLowerCase();
        const daysDiff = Math.abs(inv1.issueDate.getTime() - inv2.issueDate.getTime()) / (1000 * 60 * 60 * 24);

        if (sameAmount && sameCounterparty && daysDiff <= 7) {
          const c1 = companyMap.get(inv1.clientCompanyId);
          const c2 = companyMap.get(inv2.clientCompanyId);
          if (!c1 || !c2) continue;

          matches.push({
            type: "SAME_AMOUNT_COUNTERPARTY",
            severity: "high",
            description: `Aynı karşı taraf (${inv1.counterpartyName}) ve aynı tutar (${Number(inv1.totalAmount).toLocaleString("tr-TR")} TL) ${daysDiff.toFixed(0)} gün arayla farklı şirketlerde: "${c1.name}" ve "${c2.name}"`,
            company1: { id: c1.id, name: c1.name },
            company2: { id: c2.id, name: c2.name },
            invoiceId1: inv1.id,
            invoiceId2: inv2.id,
            amount: Number(inv1.totalAmount),
            matchConfidence: 0.9,
          });
        }
      }
    }

    // CHECK 3: Circular invoicing (A sells to B, B sells to A with similar amounts)
    for (let i = 0; i < invoices.length; i++) {
      const inv1 = invoices[i];
      if (!inv1.counterpartyTaxNumber) continue;

      // Find company with that tax number
      const counterpartyCompany = companies.find((c) => c.taxNumber === inv1.counterpartyTaxNumber);
      if (!counterpartyCompany || counterpartyCompany.id === inv1.clientCompanyId) continue;

      // Look for reverse invoice (counterparty company invoicing back to this company)
      for (let j = i + 1; j < invoices.length; j++) {
        const inv2 = invoices[j];
        if (inv2.clientCompanyId !== counterpartyCompany.id) continue;

        const sourceCompany = companyMap.get(inv1.clientCompanyId);
        if (!sourceCompany) continue;

        // Check if inv2 counterparty matches the source company
        if (inv2.counterpartyTaxNumber !== sourceCompany.taxNumber) continue;

        const amountDiff = Math.abs(Number(inv1.totalAmount) - Number(inv2.totalAmount));
        const amountSimilarity = Number(inv1.totalAmount) > 0
          ? 1 - (amountDiff / Number(inv1.totalAmount))
          : 0;

        if (amountSimilarity > 0.8) {
          const daysDiff = Math.abs(inv1.issueDate.getTime() - inv2.issueDate.getTime()) / (1000 * 60 * 60 * 24);

          matches.push({
            type: "CIRCULAR_INVOICE",
            severity: "high",
            description: `Dairesel faturalama tespit edildi: "${sourceCompany.name}" → "${counterpartyCompany.name}" (${Number(inv1.totalAmount).toLocaleString("tr-TR")} TL) ve ters yönde (${Number(inv2.totalAmount).toLocaleString("tr-TR")} TL), ${daysDiff.toFixed(0)} gün arayla`,
            company1: { id: sourceCompany.id, name: sourceCompany.name },
            company2: { id: counterpartyCompany.id, name: counterpartyCompany.name },
            invoiceId1: inv1.id,
            invoiceId2: inv2.id,
            amount: Number(inv1.totalAmount),
            matchConfidence: amountSimilarity,
          });
        }
      }
    }

    // CHECK 4: Mirror transactions (purchase in one company matches sale in another on same day)
    const salesByDate = new Map<string, Array<typeof invoices[0]>>();
    const purchasesByDate = new Map<string, Array<typeof invoices[0]>>();

    for (const inv of invoices) {
      const dateKey = inv.issueDate.toISOString().split("T")[0];
      const type = (inv.type || "").toUpperCase();
      if (type === "SALES") {
        const existing = salesByDate.get(dateKey) || [];
        existing.push(inv);
        salesByDate.set(dateKey, existing);
      } else if (type === "PURCHASE") {
        const existing = purchasesByDate.get(dateKey) || [];
        existing.push(inv);
        purchasesByDate.set(dateKey, existing);
      }
    }

    for (const [date, sales] of salesByDate.entries()) {
      const purchases = purchasesByDate.get(date) || [];
      for (const sale of sales) {
        for (const purchase of purchases) {
          if (sale.clientCompanyId === purchase.clientCompanyId) continue;

          const amountMatch = Math.abs(Number(sale.totalAmount) - Number(purchase.totalAmount)) < 0.01;
          if (!amountMatch) continue;

          const c1 = companyMap.get(sale.clientCompanyId);
          const c2 = companyMap.get(purchase.clientCompanyId);
          if (!c1 || !c2) continue;

          // Avoid duplicating circular invoice matches
          const alreadyMatched = matches.some(
            (m) =>
              m.type === "CIRCULAR_INVOICE" &&
              ((m.company1.id === c1.id && m.company2.id === c2.id) ||
               (m.company1.id === c2.id && m.company2.id === c1.id))
          );

          if (!alreadyMatched) {
            matches.push({
              type: "MIRROR_TRANSACTION",
              severity: "medium",
              description: `Aynı gün aynı tutarlı satış/alış eşleşmesi: "${c1.name}" (satış) ↔ "${c2.name}" (alış), ${Number(sale.totalAmount).toLocaleString("tr-TR")} TL, tarih: ${date}`,
              company1: { id: c1.id, name: c1.name },
              company2: { id: c2.id, name: c2.name },
              invoiceId1: sale.id,
              invoiceId2: purchase.id,
              amount: Number(sale.totalAmount),
              matchConfidence: 0.85,
            });
          }
        }
      }
    }

    // Calculate risk score
    const highMatches = matches.filter((m) => m.severity === "high").length;
    const mediumMatches = matches.filter((m) => m.severity === "medium").length;
    const riskScore = Math.min(100, highMatches * 25 + mediumMatches * 10);

    const summary = matches.length === 0
      ? "Şirketler arası şüpheli fatura eşleşmesi tespit edilmedi."
      : `${matches.length} adet şirketler arası şüpheli eşleşme tespit edildi. ` +
        `GIB denetim riski: ${riskScore >= 60 ? "YÜKSEK" : riskScore >= 30 ? "ORTA" : "DÜŞÜK"}.`;

    return {
      totalMatches: matches.length,
      matches,
      riskScore,
      summary,
    };
  }

  /**
   * Scan for a specific client company's cross-company matches
   */
  async scanCompany(
    tenantId: string,
    clientCompanyId: string
  ): Promise<CrossCompanyMatchResult> {
    const fullResult = await this.scanTenant(tenantId);

    // Filter to only matches involving this company
    const companyMatches = fullResult.matches.filter(
      (m) => m.company1.id === clientCompanyId || m.company2.id === clientCompanyId
    );

    const highMatches = companyMatches.filter((m) => m.severity === "high").length;
    const mediumMatches = companyMatches.filter((m) => m.severity === "medium").length;
    const riskScore = Math.min(100, highMatches * 25 + mediumMatches * 10);

    return {
      totalMatches: companyMatches.length,
      matches: companyMatches,
      riskScore,
      summary: companyMatches.length === 0
        ? "Bu şirket için şüpheli çapraz eşleşme tespit edilmedi."
        : `${companyMatches.length} adet çapraz eşleşme tespit edildi.`,
    };
  }
}

export const crossCompanyMatchingService = new CrossCompanyMatchingService();
