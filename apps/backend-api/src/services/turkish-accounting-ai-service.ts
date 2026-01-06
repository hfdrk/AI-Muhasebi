/**
 * Turkish Accounting AI Service
 *
 * AI-powered assistant specialized for Turkish accounting.
 * Provides intelligent suggestions, explanations, and automated analysis.
 *
 * Features:
 * - Hesap Kodu (Account Code) suggestions
 * - Transaction analysis and categorization
 * - Tax calculation assistance
 * - Ba-Bs form verification
 * - Turkish accounting terminology explanations
 * - Muhasebe fişi (voucher) generation
 */

import { prisma } from "../lib/prisma";
import { createLLMClient, hasRealAIProvider, logger } from "@repo/shared-utils";
import { ragService } from "./rag-service";
import {
  TEK_DUZEN_HESAP_PLANI,
  HESAP_GRUPLARI,
  KDV_ORANLARI,
  STOPAJ_ORANLARI,
  MUHASEBE_SENARYOLARI,
  MUHASEBE_TERIMLERI,
  hesapKoduBul,
  islemIcinHesapOner,
  iliskiliHesaplariGetir,
  type HesapKodu,
  type MuhasebeSenaryo,
} from "./turkish-accounting-knowledge";

// =============================================================================
// TYPES
// =============================================================================

export interface HesapKoduOneri {
  hesapKodu: string;
  hesapAdi: string;
  ingilizce: string;
  aciklama: string;
  oneriNedeni: string;
  guvenSkor: number; // 0-100
  ornekKullanimlar: string[];
  borcMuAlacakMi: "borc" | "alacak" | "her_ikisi";
}

export interface IslemAnalizi {
  tespit_edilen_tur: string;
  onerilen_hesaplar: {
    borc: HesapKoduOneri[];
    alacak: HesapKoduOneri[];
  };
  kdv_durumu: {
    kdv_var_mi: boolean;
    oran: number;
    tutar?: number;
  };
  aciklama: string;
  uyarilar: string[];
  ilgili_mevzuat: string[];
}

export interface BaBsKontrol {
  bildirim_gerekli: boolean;
  tur: "Ba" | "Bs" | null;
  tutar: number;
  karsi_taraf_vkn?: string;
  karsi_taraf_unvan?: string;
  eksik_bilgiler: string[];
  uyarilar: string[];
}

export interface MuhasebeFisi {
  tarih: Date;
  fisNo: string;
  aciklama: string;
  satirlar: Array<{
    hesapKodu: string;
    hesapAdi: string;
    borc: number;
    alacak: number;
    aciklama?: string;
  }>;
  toplamBorc: number;
  toplamAlacak: number;
  kdvDetay?: {
    matrah: number;
    kdvOrani: number;
    kdvTutari: number;
  };
}

export interface TurkishAccountingQuestion {
  question: string;
  context?: {
    documentId?: string;
    invoiceId?: string;
    transactionId?: string;
    clientCompanyId?: string;
  };
  conversationHistory?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

export interface TurkishAccountingAnswer {
  answer: string;
  hesapOnerileri?: HesapKoduOneri[];
  ilgiliSenaryolar?: MuhasebeSenaryo[];
  kaynaklar?: string[];
  guvenSkor: number;
}

// =============================================================================
// SERVICE CLASS
// =============================================================================

export class TurkishAccountingAIService {
  private _llmClient: ReturnType<typeof createLLMClient> | null = null;

  private get llmClient() {
    if (!this._llmClient) {
      this._llmClient = createLLMClient();
    }
    return this._llmClient;
  }

  // ===========================================================================
  // HESAP KODU SUGGESTIONS
  // ===========================================================================

  /**
   * Get intelligent account code suggestions based on transaction description
   */
  async getHesapKoduOnerileri(
    tenantId: string,
    islemAciklamasi: string,
    options: {
      tutar?: number;
      tur?: "alis" | "satis" | "gider" | "gelir" | "diger";
      includeAIAnalysis?: boolean;
    } = {}
  ): Promise<HesapKoduOneri[]> {
    const { tutar, tur, includeAIAnalysis = true } = options;

    // Step 1: Get rule-based suggestions
    const kuralBasliOneriler = islemIcinHesapOner(islemAciklamasi);

    // Step 2: Convert to HesapKoduOneri format
    let oneriler: HesapKoduOneri[] = kuralBasliOneriler.map((o) => ({
      hesapKodu: o.hesap.kod,
      hesapAdi: o.hesap.isim,
      ingilizce: o.hesap.ingilizce,
      aciklama: o.hesap.aciklama,
      oneriNedeni: o.oneriNedeni,
      guvenSkor: o.tahminiSkor,
      ornekKullanimlar: o.hesap.ornekKullanimlar,
      borcMuAlacakMi: o.hesap.ozellikler.borcCalisan
        ? "borc"
        : o.hesap.ozellikler.alacakCalisan
          ? "alacak"
          : "her_ikisi",
    }));

    // Step 3: Use AI for additional context if enabled
    if (includeAIAnalysis && hasRealAIProvider()) {
      try {
        const aiOneriler = await this.getAIHesapOnerileri(islemAciklamasi, tur, tutar);

        // Merge AI suggestions with rule-based ones
        for (const aiOneri of aiOneriler) {
          const mevcut = oneriler.find((o) => o.hesapKodu === aiOneri.hesapKodu);
          if (!mevcut) {
            oneriler.push(aiOneri);
          } else {
            // Boost score if AI also suggests it
            mevcut.guvenSkor = Math.min(100, mevcut.guvenSkor + 10);
          }
        }
      } catch (error) {
        logger.warn("AI hesap önerisi alınamadı, kural tabanlı öneriler kullanılıyor", { tenantId });
      }
    }

    // Step 4: Apply type-based filtering
    if (tur) {
      oneriler = this.filterByTransactionType(oneriler, tur);
    }

    // Step 5: Sort by score and return top suggestions
    return oneriler.sort((a, b) => b.guvenSkor - a.guvenSkor).slice(0, 10);
  }

  /**
   * Get AI-powered account suggestions
   */
  private async getAIHesapOnerileri(
    islemAciklamasi: string,
    tur?: string,
    tutar?: number
  ): Promise<HesapKoduOneri[]> {
    const systemPrompt = `Sen bir Türk muhasebe uzmanısın. Tek Düzen Hesap Planı'na göre işlem kaydı önerisi yapıyorsun.
Verilen işlem açıklaması için en uygun hesap kodlarını öner.

Önemli kurallar:
1. Sadece geçerli Tek Düzen Hesap Planı kodlarını kullan
2. Her öneri için neden bu hesabı önerdiğini açıkla
3. İşlemin borç mu alacak mı olduğunu belirt
4. Güven skorunu 0-100 arasında ver

JSON formatında yanıt ver:
{
  "oneriler": [
    {
      "hesapKodu": "120",
      "hesapAdi": "ALICILAR",
      "oneriNedeni": "Kredili satış işlemi tespit edildi",
      "borcMuAlacakMi": "borc",
      "guvenSkor": 85
    }
  ]
}`;

    const userPrompt = `İşlem Açıklaması: ${islemAciklamasi}
${tur ? `İşlem Türü: ${tur}` : ""}
${tutar ? `Tutar: ${tutar.toLocaleString("tr-TR")} TL` : ""}

Bu işlem için uygun hesap kodlarını öner.`;

    try {
      const response = await this.llmClient.generateJSON({
        systemPrompt,
        userPrompt,
        maxTokens: 1000,
      });

      const oneriler: HesapKoduOneri[] = [];

      if (response.oneriler && Array.isArray(response.oneriler)) {
        for (const oneri of response.oneriler) {
          const hesap = TEK_DUZEN_HESAP_PLANI.find((h) => h.kod === oneri.hesapKodu);
          if (hesap) {
            oneriler.push({
              hesapKodu: oneri.hesapKodu,
              hesapAdi: hesap.isim,
              ingilizce: hesap.ingilizce,
              aciklama: hesap.aciklama,
              oneriNedeni: oneri.oneriNedeni || "AI önerisi",
              guvenSkor: Math.min(100, Math.max(0, oneri.guvenSkor || 70)),
              ornekKullanimlar: hesap.ornekKullanimlar,
              borcMuAlacakMi: oneri.borcMuAlacakMi || "her_ikisi",
            });
          }
        }
      }

      return oneriler;
    } catch (error) {
      logger.error("AI hesap önerisi hatası", undefined, { error });
      return [];
    }
  }

  /**
   * Filter suggestions by transaction type
   */
  private filterByTransactionType(
    oneriler: HesapKoduOneri[],
    tur: "alis" | "satis" | "gider" | "gelir" | "diger"
  ): HesapKoduOneri[] {
    const turFiltresi: Record<string, string[]> = {
      alis: ["15", "19", "32"], // Stoklar, KDV, Satıcılar
      satis: ["12", "60", "39"], // Alıcılar, Satışlar, KDV
      gider: ["77", "76", "78", "65"], // Gider hesapları
      gelir: ["64", "60", "64"], // Gelir hesapları
      diger: [], // No filter
    };

    const gruplar = turFiltresi[tur];
    if (!gruplar || gruplar.length === 0) return oneriler;

    return oneriler.filter((o) => {
      const ilkIki = o.hesapKodu.substring(0, 2);
      return gruplar.some((g) => ilkIki.startsWith(g));
    });
  }

  // ===========================================================================
  // TRANSACTION ANALYSIS
  // ===========================================================================

  /**
   * Analyze a transaction and provide comprehensive suggestions
   */
  async analyzeTransaction(
    tenantId: string,
    input: {
      aciklama: string;
      tutar: number;
      tarih: Date;
      karsiTaraf?: string;
      belgeTipi?: string;
    }
  ): Promise<IslemAnalizi> {
    const { aciklama, tutar, tarih, karsiTaraf, belgeTipi } = input;
    const aciklamaLower = aciklama.toLowerCase();

    // Detect transaction type
    const tur = this.detectTransactionType(aciklamaLower, belgeTipi);

    // Get account suggestions
    const borcHesaplari = await this.getHesapKoduOnerileri(tenantId, aciklama, {
      tutar,
      tur: tur as any,
    });

    // Get related credit accounts
    const alacakHesaplari: HesapKoduOneri[] = [];
    for (const borcHesap of borcHesaplari.slice(0, 3)) {
      const iliskiliHesaplar = iliskiliHesaplariGetir(borcHesap.hesapKodu);
      for (const hesap of iliskiliHesaplar) {
        if (!alacakHesaplari.find((h) => h.hesapKodu === hesap.kod)) {
          alacakHesaplari.push({
            hesapKodu: hesap.kod,
            hesapAdi: hesap.isim,
            ingilizce: hesap.ingilizce,
            aciklama: hesap.aciklama,
            oneriNedeni: `${borcHesap.hesapKodu} hesabı ile ilişkili`,
            guvenSkor: borcHesap.guvenSkor - 10,
            ornekKullanimlar: hesap.ornekKullanimlar,
            borcMuAlacakMi: hesap.ozellikler.alacakCalisan ? "alacak" : "her_ikisi",
          });
        }
      }
    }

    // Detect KDV status
    const kdvDurumu = this.detectKDVStatus(aciklamaLower, tutar, tur);

    // Generate warnings
    const uyarilar: string[] = [];

    // Ba-Bs warning
    if (tutar >= 5000) {
      uyarilar.push(`⚠️ Bu işlem Ba-Bs formlarında bildirilmelidir (Tutar: ${tutar.toLocaleString("tr-TR")} TL)`);
    }

    // End of month warning
    const ayinSonu = new Date(tarih.getFullYear(), tarih.getMonth() + 1, 0);
    const gunFarki = Math.ceil((ayinSonu.getTime() - tarih.getTime()) / (1000 * 60 * 60 * 24));
    if (gunFarki <= 5) {
      uyarilar.push("⚠️ Ay sonuna yaklaştınız. KDV beyannamesi hazırlığını unutmayın.");
    }

    // KDV warning
    if (kdvDurumu.kdv_var_mi && !aciklamaLower.includes("kdv")) {
      uyarilar.push("💡 Bu işlemde KDV hesaplanmalıdır. Fatura düzenlenmesini kontrol edin.");
    }

    // Related legislation
    const ilgiliMevzuat: string[] = [];
    if (tur === "satis" || tur === "alis") {
      ilgiliMevzuat.push("VUK 229 - Fatura Düzenleme Zorunluluğu");
      ilgiliMevzuat.push("KDV Kanunu - İndirim ve Beyan");
    }
    if (tutar >= 5000) {
      ilgiliMevzuat.push("213 sayılı VUK Mükerrer 257 - Ba-Bs Bildirimi");
    }

    return {
      tespit_edilen_tur: tur,
      onerilen_hesaplar: {
        borc: borcHesaplari,
        alacak: alacakHesaplari.sort((a, b) => b.guvenSkor - a.guvenSkor).slice(0, 5),
      },
      kdv_durumu: kdvDurumu,
      aciklama: `${tur.charAt(0).toUpperCase() + tur.slice(1)} işlemi tespit edildi. Önerilen hesapları inceleyiniz.`,
      uyarilar,
      ilgili_mevzuat: ilgiliMevzuat,
    };
  }

  /**
   * Detect transaction type from description
   */
  private detectTransactionType(aciklama: string, belgeTipi?: string): string {
    if (belgeTipi === "SATIS_FATURASI" || aciklama.includes("satış") || aciklama.includes("satılan")) {
      return "satis";
    }
    if (belgeTipi === "ALIS_FATURASI" || aciklama.includes("alış") || aciklama.includes("alınan")) {
      return "alis";
    }
    if (aciklama.includes("gider") || aciklama.includes("masraf") || aciklama.includes("ödeme")) {
      return "gider";
    }
    if (aciklama.includes("gelir") || aciklama.includes("tahsilat")) {
      return "gelir";
    }
    return "diger";
  }

  /**
   * Detect KDV status
   */
  private detectKDVStatus(
    aciklama: string,
    tutar: number,
    tur: string
  ): {
    kdv_var_mi: boolean;
    oran: number;
    tutar?: number;
  } {
    // Check for KDV exempt keywords
    const kdvIstisnalari = ["ihracat", "serbest bölge", "kdv istisna", "teşvik"];
    const istisna = kdvIstisnalari.some((k) => aciklama.includes(k));

    if (istisna) {
      return { kdv_var_mi: false, oran: 0 };
    }

    // Determine rate based on type
    let oran = KDV_ORANLARI.GENEL; // %20 default

    // Check for reduced rate items
    const indirimliOranlar = ["gıda", "yiyecek", "tarım", "kitap", "gazete", "eğitim", "sağlık"];
    if (indirimliOranlar.some((k) => aciklama.includes(k))) {
      oran = KDV_ORANLARI.INDIRIMLI_1; // %10
    }

    const temelGida = ["ekmek", "süt", "un", "şeker", "pirinç", "bulgur"];
    if (temelGida.some((k) => aciklama.includes(k))) {
      oran = KDV_ORANLARI.INDIRIMLI_2; // %1
    }

    // Calculate KDV amount (assuming tutar is KDV inclusive)
    const kdvTutar = tutar - tutar / (1 + oran / 100);

    return {
      kdv_var_mi: true,
      oran,
      tutar: Math.round(kdvTutar * 100) / 100,
    };
  }

  // ===========================================================================
  // BA-BS VERIFICATION
  // ===========================================================================

  /**
   * Check if a transaction requires Ba-Bs reporting
   */
  async checkBaBsRequirement(
    tenantId: string,
    input: {
      tutar: number;
      karsiTarafVkn?: string;
      karsiTarafUnvan?: string;
      islemTuru: "alis" | "satis";
      faturaTarihi: Date;
    }
  ): Promise<BaBsKontrol> {
    const { tutar, karsiTarafVkn, karsiTarafUnvan, islemTuru, faturaTarihi } = input;

    const eksikBilgiler: string[] = [];
    const uyarilar: string[] = [];

    // Check if reporting is required (5,000 TL threshold)
    const bildirimGerekli = tutar >= 5000;

    if (!bildirimGerekli) {
      return {
        bildirim_gerekli: false,
        tur: null,
        tutar,
        karsi_taraf_vkn: karsiTarafVkn,
        karsi_taraf_unvan: karsiTarafUnvan,
        eksik_bilgiler: [],
        uyarilar: [],
      };
    }

    // Validate VKN
    if (!karsiTarafVkn) {
      eksikBilgiler.push("Karşı taraf VKN/TCKN eksik");
    } else if (!this.validateVKN(karsiTarafVkn)) {
      uyarilar.push("VKN/TCKN formatı hatalı olabilir. Kontrol ediniz.");
    }

    // Validate company name
    if (!karsiTarafUnvan || karsiTarafUnvan.length < 3) {
      eksikBilgiler.push("Karşı taraf unvanı eksik veya yetersiz");
    }

    // Check deadline warning
    const bildirimSonGun = new Date(faturaTarihi.getFullYear(), faturaTarihi.getMonth() + 2, 0);
    const bugun = new Date();
    const kalanGun = Math.ceil((bildirimSonGun.getTime() - bugun.getTime()) / (1000 * 60 * 60 * 24));

    if (kalanGun <= 7 && kalanGun > 0) {
      uyarilar.push(`⚠️ Ba-Bs bildirim süresi ${kalanGun} gün içinde doluyor!`);
    } else if (kalanGun <= 0) {
      uyarilar.push("❌ Ba-Bs bildirim süresi geçmiş olabilir! Acil kontrol gerekli.");
    }

    return {
      bildirim_gerekli: true,
      tur: islemTuru === "alis" ? "Ba" : "Bs",
      tutar,
      karsi_taraf_vkn: karsiTarafVkn,
      karsi_taraf_unvan: karsiTarafUnvan,
      eksik_bilgiler: eksikBilgiler,
      uyarilar,
    };
  }

  /**
   * Validate Turkish VKN (Tax ID) or TCKN (National ID)
   */
  private validateVKN(vkn: string): boolean {
    // Remove spaces and dashes
    const clean = vkn.replace(/[\s-]/g, "");

    // VKN is 10 digits, TCKN is 11 digits
    if (!/^\d{10,11}$/.test(clean)) {
      return false;
    }

    // TCKN validation (11 digits)
    if (clean.length === 11) {
      // First digit cannot be 0
      if (clean[0] === "0") return false;

      // Checksum validation
      const digits = clean.split("").map(Number);
      const sum1 = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
      const sum2 = digits[1] + digits[3] + digits[5] + digits[7];

      const check1 = (sum1 * 7 - sum2) % 10;
      const check2 = (sum1 + sum2 + digits[9]) % 10;

      return digits[9] === check1 && digits[10] === check2;
    }

    // VKN validation (10 digits) - simpler check
    return true;
  }

  // ===========================================================================
  // VOUCHER GENERATION
  // ===========================================================================

  /**
   * Generate accounting voucher (muhasebe fişi) from transaction details
   */
  async generateMuhasebeFisi(
    tenantId: string,
    input: {
      aciklama: string;
      tutar: number;
      tarih: Date;
      kdvDahil?: boolean;
      kdvOrani?: number;
      fisNo?: string;
    }
  ): Promise<MuhasebeFisi> {
    const { aciklama, tutar, tarih, kdvDahil = true, kdvOrani = 20, fisNo } = input;

    // Analyze transaction to get account suggestions
    const analiz = await this.analyzeTransaction(tenantId, {
      aciklama,
      tutar,
      tarih,
    });

    // Calculate amounts
    let matrah: number;
    let kdvTutari: number;

    if (kdvDahil) {
      matrah = tutar / (1 + kdvOrani / 100);
      kdvTutari = tutar - matrah;
    } else {
      matrah = tutar;
      kdvTutari = tutar * (kdvOrani / 100);
    }

    matrah = Math.round(matrah * 100) / 100;
    kdvTutari = Math.round(kdvTutari * 100) / 100;

    // Build voucher lines
    const satirlar: MuhasebeFisi["satirlar"] = [];

    // Add debit account (first suggestion)
    if (analiz.onerilen_hesaplar.borc.length > 0) {
      const borcHesap = analiz.onerilen_hesaplar.borc[0];
      satirlar.push({
        hesapKodu: borcHesap.hesapKodu,
        hesapAdi: borcHesap.hesapAdi,
        borc: kdvDahil ? tutar : tutar + kdvTutari,
        alacak: 0,
        aciklama: aciklama,
      });
    }

    // Add credit accounts
    if (analiz.onerilen_hesaplar.alacak.length > 0) {
      const alacakHesap = analiz.onerilen_hesaplar.alacak[0];
      satirlar.push({
        hesapKodu: alacakHesap.hesapKodu,
        hesapAdi: alacakHesap.hesapAdi,
        borc: 0,
        alacak: matrah,
        aciklama: `${aciklama} - Matrah`,
      });
    }

    // Add KDV line if applicable
    if (analiz.kdv_durumu.kdv_var_mi && kdvTutari > 0) {
      const kdvHesapKodu = analiz.tespit_edilen_tur === "satis" ? "391" : "191";
      const kdvHesapAdi =
        analiz.tespit_edilen_tur === "satis" ? "HESAPLANAN KDV" : "İNDİRİLECEK KDV";

      satirlar.push({
        hesapKodu: kdvHesapKodu,
        hesapAdi: kdvHesapAdi,
        borc: analiz.tespit_edilen_tur === "alis" ? kdvTutari : 0,
        alacak: analiz.tespit_edilen_tur === "satis" ? kdvTutari : 0,
        aciklama: `KDV %${kdvOrani}`,
      });
    }

    // Calculate totals
    const toplamBorc = satirlar.reduce((sum, s) => sum + s.borc, 0);
    const toplamAlacak = satirlar.reduce((sum, s) => sum + s.alacak, 0);

    return {
      tarih,
      fisNo: fisNo || this.generateFisNo(tarih),
      aciklama,
      satirlar,
      toplamBorc: Math.round(toplamBorc * 100) / 100,
      toplamAlacak: Math.round(toplamAlacak * 100) / 100,
      kdvDetay: analiz.kdv_durumu.kdv_var_mi
        ? {
            matrah,
            kdvOrani,
            kdvTutari,
          }
        : undefined,
    };
  }

  /**
   * Generate voucher number
   */
  private generateFisNo(tarih: Date): string {
    const yil = tarih.getFullYear();
    const ay = String(tarih.getMonth() + 1).padStart(2, "0");
    const rastgele = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    return `MF-${yil}${ay}-${rastgele}`;
  }

  // ===========================================================================
  // AI-POWERED Q&A
  // ===========================================================================

  /**
   * Answer Turkish accounting questions using AI and knowledge base
   */
  async answerAccountingQuestion(
    tenantId: string,
    input: TurkishAccountingQuestion
  ): Promise<TurkishAccountingAnswer> {
    const { question, context, conversationHistory } = input;
    const questionLower = question.toLowerCase();

    // Step 1: Search knowledge base for relevant information
    const hesapAramasiYapildiMi =
      questionLower.includes("hesap") ||
      questionLower.includes("kod") ||
      questionLower.includes("kayıt") ||
      questionLower.includes("fiş");

    let hesapOnerileri: HesapKoduOneri[] | undefined;
    if (hesapAramasiYapildiMi) {
      const eslesen = hesapKoduBul(question);
      hesapOnerileri = eslesen.slice(0, 5).map((h) => ({
        hesapKodu: h.kod,
        hesapAdi: h.isim,
        ingilizce: h.ingilizce,
        aciklama: h.aciklama,
        oneriNedeni: "Arama sonucu",
        guvenSkor: 80,
        ornekKullanimlar: h.ornekKullanimlar,
        borcMuAlacakMi: h.ozellikler.borcCalisan
          ? "borc"
          : h.ozellikler.alacakCalisan
            ? "alacak"
            : "her_ikisi",
      }));
    }

    // Step 2: Find relevant scenarios
    const ilgiliSenaryolar = MUHASEBE_SENARYOLARI.filter((s) => {
      const senaryoText = `${s.baslik} ${s.aciklama} ${s.kategori}`.toLowerCase();
      return question
        .toLowerCase()
        .split(" ")
        .some((word) => word.length > 3 && senaryoText.includes(word));
    }).slice(0, 3);

    // Step 3: Get RAG context if available
    let ragContext = "";
    try {
      const ragResult = await ragService.retrieveContext(question, tenantId, {
        topK: 3,
        includeMetadata: true,
      });
      if (ragResult.documents.length > 0) {
        ragContext = ragResult.documents.map((d) => d.text).join("\n\n");
      }
    } catch {
      // RAG not available, continue without
    }

    // Step 4: Build comprehensive prompt
    const systemPrompt = `Sen bir Türk muhasebe uzmanısın. Kullanıcının muhasebe sorularına detaylı ve doğru yanıtlar veriyorsun.

Bilgi tabanın:
1. Tek Düzen Hesap Planı (Tüm hesap kodları ve açıklamaları)
2. Türk Vergi Mevzuatı (KDV, Gelir Vergisi, Kurumlar Vergisi)
3. TMS/TFRS (Türkiye Muhasebe Standartları)
4. SGK Mevzuatı
5. KVKK (Kişisel Verilerin Korunması)

Yanıt kuralları:
- Her zaman Türkçe yanıt ver
- Hesap kodlarını ve isimlerini doğru kullan
- Vergi oranlarını güncel tut (KDV %20, Kurumlar %25)
- Mevzuat referansları ver
- Pratik örnekler sun
- Karmaşık konuları basitçe açıkla

${
  hesapOnerileri && hesapOnerileri.length > 0
    ? `
İlgili Hesap Kodları:
${hesapOnerileri.map((h) => `- ${h.hesapKodu} ${h.hesapAdi}: ${h.aciklama}`).join("\n")}
`
    : ""
}

${
  ilgiliSenaryolar.length > 0
    ? `
İlgili Muhasebe Senaryoları:
${ilgiliSenaryolar.map((s) => `- ${s.baslik}: ${s.aciklama}`).join("\n")}
`
    : ""
}

${ragContext ? `\nMüşteri Verileri:\n${ragContext}` : ""}`;

    const userPrompt = conversationHistory
      ? `Önceki konuşma:\n${conversationHistory.map((m) => `${m.role === "user" ? "Kullanıcı" : "Asistan"}: ${m.content}`).join("\n")}\n\nYeni soru: ${question}`
      : question;

    // Step 5: Generate AI response
    let answer: string;
    let guvenSkor = 80;

    if (hasRealAIProvider()) {
      try {
        answer = await this.llmClient.generateText({
          systemPrompt,
          userPrompt,
          maxTokens: 2000,
        });
        guvenSkor = 90;
      } catch (error) {
        logger.error("AI yanıt hatası", { tenantId }, { error });
        answer = this.generateFallbackAnswer(question, hesapOnerileri, ilgiliSenaryolar);
        guvenSkor = 60;
      }
    } else {
      answer = this.generateFallbackAnswer(question, hesapOnerileri, ilgiliSenaryolar);
      guvenSkor = 60;
    }

    // Step 6: Compile sources
    const kaynaklar: string[] = [];
    if (hesapOnerileri && hesapOnerileri.length > 0) {
      kaynaklar.push("Tek Düzen Hesap Planı");
    }
    if (ilgiliSenaryolar.length > 0) {
      kaynaklar.push("Muhasebe Senaryoları Veritabanı");
    }
    if (ragContext) {
      kaynaklar.push("Müşteri Belgeleri (RAG)");
    }
    if (hasRealAIProvider()) {
      kaynaklar.push("AI Muhasebe Asistanı");
    }

    return {
      answer,
      hesapOnerileri,
      ilgiliSenaryolar: ilgiliSenaryolar.length > 0 ? ilgiliSenaryolar : undefined,
      kaynaklar,
      guvenSkor,
    };
  }

  /**
   * Generate fallback answer when AI is not available
   */
  private generateFallbackAnswer(
    question: string,
    hesapOnerileri?: HesapKoduOneri[],
    senaryolar?: MuhasebeSenaryo[]
  ): string {
    let answer = "";

    if (hesapOnerileri && hesapOnerileri.length > 0) {
      answer += "**İlgili Hesap Kodları:**\n\n";
      for (const h of hesapOnerileri) {
        answer += `- **${h.hesapKodu} ${h.hesapAdi}**: ${h.aciklama}\n`;
        if (h.ornekKullanimlar.length > 0) {
          answer += `  - Örnek: ${h.ornekKullanimlar[0]}\n`;
        }
      }
      answer += "\n";
    }

    if (senaryolar && senaryolar.length > 0) {
      answer += "**İlgili Muhasebe Senaryoları:**\n\n";
      for (const s of senaryolar) {
        answer += `### ${s.baslik}\n`;
        answer += `${s.aciklama}\n\n`;
        answer += `**Örnek Kayıt:**\n`;
        answer += `- Borç: ${s.ornekKayit.borc.map((b) => `${b.hesap} ${b.tutar}`).join(", ")}\n`;
        answer += `- Alacak: ${s.ornekKayit.alacak.map((a) => `${a.hesap} ${a.tutar}`).join(", ")}\n\n`;
      }
    }

    if (!answer) {
      answer =
        "Sorunuzu anlayamadım. Lütfen daha spesifik bir soru sorun veya hesap kodu, işlem türü gibi anahtar kelimeler kullanın.";
    }

    return answer;
  }

  // ===========================================================================
  // TERMINOLOGY HELPER
  // ===========================================================================

  /**
   * Get explanation for accounting term
   */
  getTermExplanation(term: string): {
    turkce: string;
    ingilizce: string;
    aciklama: string;
  } | null {
    const termLower = term.toLowerCase().replace(/\s+/g, "_");

    // Direct match
    if (MUHASEBE_TERIMLERI[termLower]) {
      return MUHASEBE_TERIMLERI[termLower];
    }

    // Fuzzy match
    for (const [key, value] of Object.entries(MUHASEBE_TERIMLERI)) {
      if (
        value.turkce.toLowerCase().includes(term.toLowerCase()) ||
        value.ingilizce.toLowerCase().includes(term.toLowerCase())
      ) {
        return value;
      }
    }

    return null;
  }

  /**
   * Get all accounting terms
   */
  getAllTerms(): Array<{
    key: string;
    turkce: string;
    ingilizce: string;
    aciklama: string;
  }> {
    return Object.entries(MUHASEBE_TERIMLERI).map(([key, value]) => ({
      key,
      ...value,
    }));
  }
}

export const turkishAccountingAIService = new TurkishAccountingAIService();
