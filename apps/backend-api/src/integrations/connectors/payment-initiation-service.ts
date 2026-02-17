import { logger } from "@repo/shared-utils";

/**
 * Payment Initiation Service (PIS) Framework
 *
 * Implements PSD2-compliant payment initiation across Turkish banks.
 * This service provides a unified interface for initiating payments
 * through various Turkish bank APIs.
 *
 * Supported Payment Types:
 * - FAST (Fonların Anlık ve Sürekli Transferi) - Turkey's instant payment system
 * - EFT (Elektronik Fon Transferi) - Standard bank transfer
 * - Havale - Internal bank transfer
 * - TR Karekod - QR code payments
 * - Mobile wallet payments (Wing, Parapara, etc.)
 *
 * Features:
 * - Strong Customer Authentication (SCA) handling
 * - Payment status tracking
 * - Payment confirmation
 * - Bulk payment support
 * - Scheduled payments
 *
 * References:
 * - TCMB FAST: https://www.tcmb.gov.tr/wps/wcm/connect/tr/tcmb+tr/main+menu/temel+faaliyetler/odeme+sistemleri/fast
 * - PSD2 PIS: https://www.berlin-group.org/nextgenpsd2-downloads
 */

// ==================== Payment Types ====================

export type PaymentType =
  | "FAST"           // Instant payment
  | "EFT"            // Standard bank transfer
  | "HAVALE"         // Internal transfer
  | "SWIFT"          // International transfer
  | "TR_KAREKOD"     // QR code payment
  | "MOBILE_WALLET"; // Mobile wallet (Wing, Parapara, etc.)

export type PaymentStatus =
  | "RCVD"    // Received
  | "PDNG"    // Pending
  | "ACTC"    // AcceptedTechnicalValidation
  | "ACCP"    // AcceptedCustomerProfile
  | "ACSC"    // AcceptedSettlementCompleted
  | "ACSP"    // AcceptedSettlementInProgress
  | "RJCT"    // Rejected
  | "CANC"    // Cancelled
  | "ACWC"    // AcceptedWithChange
  | "PART";   // PartiallyAccepted

export type PaymentPurpose =
  | "SALA"    // Salary payment
  | "PENS"    // Pension payment
  | "RENT"    // Rent payment
  | "BILL"    // Bill payment
  | "TAXS"    // Tax payment
  | "SUPP"    // Supplier payment
  | "LOAN"    // Loan payment
  | "OTHR";   // Other

// ==================== Payment Interfaces ====================

export interface PaymentRequest {
  paymentType: PaymentType;
  debtorAccount: AccountReference;
  creditorAccount?: AccountReference;
  creditorPhone?: string; // For mobile wallet payments
  instructedAmount: MoneyAmount;
  remittanceInfo?: RemittanceInfo;
  requestedExecutionDate?: string; // ISO date for scheduled payments
  purpose?: PaymentPurpose;
  priority?: "NORM" | "HIGH";
}

export interface AccountReference {
  iban: string;
  currency?: string;
  name?: string;
  bic?: string; // For SWIFT transfers
}

export interface MoneyAmount {
  amount: number;
  currency: string;
}

export interface RemittanceInfo {
  unstructured?: string;
  structured?: StructuredRemittanceInfo;
}

export interface StructuredRemittanceInfo {
  reference?: string;
  referenceType?: string;
  referenceIssuer?: string;
}

export interface PaymentResponse {
  paymentId: string;
  transactionStatus: PaymentStatus;
  aspspId?: string; // Bank's internal ID
  scaRequired: boolean;
  scaRedirectUrl?: string;
  scaMethod?: "REDIRECT" | "EMBEDDED" | "DECOUPLED";
  challengeData?: ChallengeData;
  createdAt: string;
  links?: PaymentLinks;
}

export interface ChallengeData {
  challengeType: "SMS" | "MOBILE_APP" | "PUSH" | "TOTP";
  challengeHint?: string;
  otpMaxLength?: number;
  otpFormat?: "CHARACTERS" | "INTEGER";
}

export interface PaymentLinks {
  self?: string;
  status?: string;
  scaRedirect?: string;
  scaStatus?: string;
  confirmation?: string;
}

export interface PaymentStatusResponse {
  paymentId: string;
  transactionStatus: PaymentStatus;
  fundsAvailable?: boolean;
  statusReasonCode?: string;
  statusReasonText?: string;
  acceptanceDateTime?: string;
  updateDateTime?: string;
}

export interface PaymentConfirmation {
  paymentId: string;
  authenticationData?: string; // OTP or similar
  psuCredentials?: PSUCredentials;
}

export interface PSUCredentials {
  password?: string;
  encryptedPassword?: string;
  additionalPassword?: string;
}

// ==================== Bulk Payment Interfaces ====================

export interface BulkPaymentRequest {
  batchBookingPreferred?: boolean;
  debtorAccount: AccountReference;
  requestedExecutionDate?: string;
  payments: SinglePaymentInBulk[];
}

export interface SinglePaymentInBulk {
  instructedAmount: MoneyAmount;
  creditorAccount: AccountReference;
  creditorName?: string;
  remittanceInfo?: RemittanceInfo;
}

export interface BulkPaymentResponse {
  paymentId: string;
  transactionStatus: PaymentStatus;
  payments: PaymentResponse[];
  scaRequired: boolean;
  scaRedirectUrl?: string;
}

// ==================== Standing Order Interfaces ====================

export interface StandingOrderRequest {
  debtorAccount: AccountReference;
  creditorAccount: AccountReference;
  instructedAmount: MoneyAmount;
  frequency: PaymentFrequency;
  startDate: string;
  endDate?: string;
  executionRule?: "FOLLOWING" | "PRECEDING";
  remittanceInfo?: RemittanceInfo;
}

export type PaymentFrequency =
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "YEARLY";

export interface StandingOrderResponse {
  standingOrderId: string;
  transactionStatus: PaymentStatus;
  nextExecutionDate?: string;
  scaRequired: boolean;
  scaRedirectUrl?: string;
}

// ==================== FAST Payment Specifics ====================

export interface FASTPaymentRequest extends PaymentRequest {
  paymentType: "FAST";
  fastPaymentSubType?: "P2P" | "C2B" | "B2C" | "B2B";
}

export interface FASTPaymentResponse extends PaymentResponse {
  fastReferenceNumber?: string;
  settlementTime?: string;
  participantBankCode?: string;
}

// ==================== TR Karekod Payment Specifics ====================

export interface TRKarekodPaymentRequest {
  debtorAccount: AccountReference;
  qrData: string;
  amount?: MoneyAmount; // Optional if included in QR
}

export interface TRKarekodPaymentResponse extends PaymentResponse {
  creditorName?: string;
  creditorIban?: string;
  merchantCategoryCode?: string;
  terminalId?: string;
}

// ==================== Payment Initiation Service Class ====================

export class PaymentInitiationService {
  private bankCode: string;
  private apiUrl: string;
  private accessToken: string | null = null;
  private headers: Record<string, string> = {};

  constructor(bankCode: string, apiUrl: string) {
    this.bankCode = bankCode;
    this.apiUrl = apiUrl;
  }

  /**
   * Set access token for authenticated requests
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
    this.headers["Authorization"] = `Bearer ${token}`;
  }

  /**
   * Set custom headers
   */
  setHeaders(headers: Record<string, string>): void {
    this.headers = { ...this.headers, ...headers };
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Get standard PSD2 headers
   */
  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-Request-ID": this.generateRequestId(),
      ...this.headers,
    };
  }

  /**
   * Initiate a single payment
   */
  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    if (!this.accessToken) {
      throw new Error("Access token gerekli. Önce yetkilendirme yapın.");
    }

    const endpoint = this.getPaymentEndpoint(request.paymentType);

    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(this.formatPaymentRequest(request)),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[PIS] Ödeme başlatılamadı: ${response.status} - ${errorText}`);
      throw new Error(`Ödeme başlatılamadı: ${response.status}`);
    }

    const data: any = await response.json();
    return this.parsePaymentResponse(data as Record<string, unknown>);
  }

  /**
   * Initiate a FAST payment
   */
  async initiateFASTPayment(request: FASTPaymentRequest): Promise<FASTPaymentResponse> {
    const response = await this.initiatePayment(request);
    return response as FASTPaymentResponse;
  }

  /**
   * Initiate a TR Karekod payment
   */
  async initiateTRKarekodPayment(request: TRKarekodPaymentRequest): Promise<TRKarekodPaymentResponse> {
    if (!this.accessToken) {
      throw new Error("Access token gerekli. Önce yetkilendirme yapın.");
    }

    const response = await fetch(`${this.apiUrl}/payments/tr-karekod`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        debtorAccount: { iban: request.debtorAccount.iban },
        qrData: request.qrData,
        instructedAmount: request.amount ? {
          amount: request.amount.amount.toFixed(2),
          currency: request.amount.currency,
        } : undefined,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[PIS] TR Karekod ödeme başlatılamadı: ${response.status} - ${errorText}`);
      throw new Error(`TR Karekod ödeme başlatılamadı: ${response.status}`);
    }

    const data: any = await response.json();
    return this.parsePaymentResponse(data as Record<string, unknown>) as TRKarekodPaymentResponse;
  }

  /**
   * Initiate bulk payments
   */
  async initiateBulkPayment(request: BulkPaymentRequest): Promise<BulkPaymentResponse> {
    if (!this.accessToken) {
      throw new Error("Access token gerekli. Önce yetkilendirme yapın.");
    }

    const response = await fetch(`${this.apiUrl}/payments/bulk`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        batchBookingPreferred: request.batchBookingPreferred,
        debtorAccount: { iban: request.debtorAccount.iban },
        requestedExecutionDate: request.requestedExecutionDate,
        payments: request.payments.map((p) => ({
          instructedAmount: {
            amount: p.instructedAmount.amount.toFixed(2),
            currency: p.instructedAmount.currency,
          },
          creditorAccount: { iban: p.creditorAccount.iban },
          creditorName: p.creditorName,
          remittanceInformationUnstructured: p.remittanceInfo?.unstructured,
        })),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[PIS] Toplu ödeme başlatılamadı: ${response.status} - ${errorText}`);
      throw new Error(`Toplu ödeme başlatılamadı: ${response.status}`);
    }

    const data: any = await response.json();
    return {
      paymentId: data.paymentId,
      transactionStatus: data.transactionStatus,
      payments: data.payments?.map((p: any) => this.parsePaymentResponse(p as Record<string, unknown>)) || [],
      scaRequired: !!data._links?.scaRedirect,
      scaRedirectUrl: data._links?.scaRedirect?.href,
    };
  }

  /**
   * Create a standing order
   */
  async createStandingOrder(request: StandingOrderRequest): Promise<StandingOrderResponse> {
    if (!this.accessToken) {
      throw new Error("Access token gerekli. Önce yetkilendirme yapın.");
    }

    const response = await fetch(`${this.apiUrl}/standing-orders`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        debtorAccount: { iban: request.debtorAccount.iban },
        creditorAccount: { iban: request.creditorAccount.iban },
        instructedAmount: {
          amount: request.instructedAmount.amount.toFixed(2),
          currency: request.instructedAmount.currency,
        },
        frequency: request.frequency,
        startDate: request.startDate,
        endDate: request.endDate,
        executionRule: request.executionRule,
        remittanceInformationUnstructured: request.remittanceInfo?.unstructured,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[PIS] Düzenli ödeme talimatı oluşturulamadı: ${response.status} - ${errorText}`);
      throw new Error(`Düzenli ödeme talimatı oluşturulamadı: ${response.status}`);
    }

    const data: any = await response.json();
    return {
      standingOrderId: data.standingOrderId,
      transactionStatus: data.transactionStatus,
      nextExecutionDate: data.nextExecutionDate,
      scaRequired: !!data._links?.scaRedirect,
      scaRedirectUrl: data._links?.scaRedirect?.href,
    };
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string, paymentType: PaymentType = "FAST"): Promise<PaymentStatusResponse> {
    if (!this.accessToken) {
      throw new Error("Access token gerekli. Önce yetkilendirme yapın.");
    }

    const endpoint = this.getPaymentEndpoint(paymentType);

    const response = await fetch(`${this.apiUrl}${endpoint}/${encodeURIComponent(paymentId)}/status`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[PIS] Ödeme durumu alınamadı: ${response.status} - ${errorText}`);
      throw new Error(`Ödeme durumu alınamadı: ${response.status}`);
    }

    const data: any = await response.json();
    return {
      paymentId: data.paymentId || paymentId,
      transactionStatus: data.transactionStatus,
      fundsAvailable: data.fundsAvailable,
      statusReasonCode: data.statusReasonCode,
      statusReasonText: this.translateStatusReason(data.statusReasonCode),
      acceptanceDateTime: data.acceptanceDateTime,
      updateDateTime: data.updateDateTime,
    };
  }

  /**
   * Confirm payment with SCA
   */
  async confirmPayment(confirmation: PaymentConfirmation, paymentType: PaymentType = "FAST"): Promise<PaymentResponse> {
    if (!this.accessToken) {
      throw new Error("Access token gerekli. Önce yetkilendirme yapın.");
    }

    const endpoint = this.getPaymentEndpoint(paymentType);

    const response = await fetch(`${this.apiUrl}${endpoint}/${encodeURIComponent(confirmation.paymentId)}/confirm`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        authenticationData: confirmation.authenticationData,
        psuCredentials: confirmation.psuCredentials,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[PIS] Ödeme onaylanamadı: ${response.status} - ${errorText}`);
      throw new Error(`Ödeme onaylanamadı: ${response.status}`);
    }

    const data: any = await response.json();
    return this.parsePaymentResponse(data as Record<string, unknown>);
  }

  /**
   * Cancel a pending payment
   */
  async cancelPayment(paymentId: string, paymentType: PaymentType = "FAST"): Promise<{ success: boolean; message: string }> {
    if (!this.accessToken) {
      throw new Error("Access token gerekli. Önce yetkilendirme yapın.");
    }

    const endpoint = this.getPaymentEndpoint(paymentType);

    const response = await fetch(`${this.apiUrl}${endpoint}/${encodeURIComponent(paymentId)}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[PIS] Ödeme iptal edilemedi: ${response.status} - ${errorText}`);
      return {
        success: false,
        message: `Ödeme iptal edilemedi: ${response.status}`,
      };
    }

    return {
      success: true,
      message: "Ödeme başarıyla iptal edildi.",
    };
  }

  /**
   * Get payment endpoint based on type
   */
  private getPaymentEndpoint(paymentType: PaymentType): string {
    const endpoints: Record<PaymentType, string> = {
      FAST: "/payments/fast",
      EFT: "/payments/eft",
      HAVALE: "/payments/domestic-transfer",
      SWIFT: "/payments/cross-border",
      TR_KAREKOD: "/payments/tr-karekod",
      MOBILE_WALLET: "/payments/mobile-wallet",
    };

    return endpoints[paymentType] || "/payments";
  }

  /**
   * Format payment request for API
   */
  private formatPaymentRequest(request: PaymentRequest): Record<string, unknown> {
    return {
      debtorAccount: { iban: request.debtorAccount.iban },
      creditorAccount: request.creditorAccount ? {
        iban: request.creditorAccount.iban,
        currency: request.creditorAccount.currency,
        name: request.creditorAccount.name,
        bic: request.creditorAccount.bic,
      } : undefined,
      creditorPhone: request.creditorPhone,
      instructedAmount: {
        amount: request.instructedAmount.amount.toFixed(2),
        currency: request.instructedAmount.currency,
      },
      remittanceInformationUnstructured: request.remittanceInfo?.unstructured,
      remittanceInformationStructured: request.remittanceInfo?.structured,
      requestedExecutionDate: request.requestedExecutionDate,
      purposeCode: request.purpose,
      instructionPriority: request.priority,
    };
  }

  /**
   * Parse payment response from API
   */
  private parsePaymentResponse(data: Record<string, unknown>): PaymentResponse {
    return {
      paymentId: data.paymentId as string,
      transactionStatus: data.transactionStatus as PaymentStatus,
      aspspId: data.aspspId as string | undefined,
      scaRequired: !!(data._links as Record<string, unknown>)?.scaRedirect,
      scaRedirectUrl: ((data._links as Record<string, unknown>)?.scaRedirect as Record<string, string>)?.href,
      scaMethod: data.scaMethod as "REDIRECT" | "EMBEDDED" | "DECOUPLED" | undefined,
      challengeData: data.challengeData as ChallengeData | undefined,
      createdAt: new Date().toISOString(),
      links: data._links as PaymentLinks | undefined,
    };
  }

  /**
   * Translate status reason code to Turkish
   */
  private translateStatusReason(code: string | undefined): string | undefined {
    if (!code) return undefined;

    const translations: Record<string, string> = {
      "AC01": "Hesap numarası hatalı",
      "AC04": "Hesap kapalı",
      "AC06": "Hesap bloke",
      "AG01": "İşlem türü desteklenmiyor",
      "AG02": "Geçersiz banka kodu",
      "AM01": "Tutar sıfır",
      "AM02": "Tutar limit aşımı",
      "AM03": "Tutar negatif",
      "AM04": "Yetersiz bakiye",
      "AM05": "Çift kayıt",
      "BE01": "IBAN geçersiz",
      "BE04": "Alıcı adı eksik",
      "BE05": "Alıcı adresi eksik",
      "DT01": "Geçersiz tarih",
      "FF01": "Dosya formatı geçersiz",
      "MD01": "Yetki yok",
      "MD07": "Hesap sahibi ölmüş",
      "MS02": "Neden belirtilmemiş",
      "MS03": "Neden bilinmiyor",
      "RC01": "BIC geçersiz",
      "RF01": "Referans numarası geçersiz",
      "RR01": "Eksik borçlu hesap numarası",
      "RR02": "Eksik borçlu adı",
      "RR03": "Eksik alacaklı adı",
      "RR04": "Eksik alacaklı hesap numarası",
      "SL01": "Özel hizmet talep edilmiş",
      "TM01": "Geçersiz kesme zamanı",
      "FOCR": "Son talimat takibi",
      "RUTA": "Yönlendirme hatası",
    };

    return translations[code] || `Bilinmeyen hata kodu: ${code}`;
  }
}

// ==================== Factory Function ====================

/**
 * Create a Payment Initiation Service instance for a specific bank
 */
export function createPISForBank(
  bankCode: string,
  config: { apiUrl: string; accessToken?: string; headers?: Record<string, string> }
): PaymentInitiationService {
  const pis = new PaymentInitiationService(bankCode, config.apiUrl);

  if (config.accessToken) {
    pis.setAccessToken(config.accessToken);
  }

  if (config.headers) {
    pis.setHeaders(config.headers);
  }

  return pis;
}

// ==================== Utility Functions ====================

/**
 * Validate IBAN format for Turkish banks
 */
export function validateTurkishIBAN(iban: string): { valid: boolean; error?: string; bankCode?: string } {
  // Remove spaces
  const cleanIBAN = iban.replace(/\s/g, "").toUpperCase();

  // Turkish IBAN is 26 characters
  if (cleanIBAN.length !== 26) {
    return { valid: false, error: "IBAN 26 karakter olmalıdır." };
  }

  // Must start with TR
  if (!cleanIBAN.startsWith("TR")) {
    return { valid: false, error: "Türk IBAN'ı TR ile başlamalıdır." };
  }

  // Check digit validation using MOD 97
  const rearranged = cleanIBAN.slice(4) + cleanIBAN.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (char) => (char.charCodeAt(0) - 55).toString());

  let remainder = 0;
  for (let i = 0; i < numeric.length; i++) {
    remainder = (remainder * 10 + parseInt(numeric[i], 10)) % 97;
  }

  if (remainder !== 1) {
    return { valid: false, error: "IBAN kontrol basamağı hatalı." };
  }

  // Extract bank code (positions 5-9)
  const bankCode = cleanIBAN.slice(4, 9);

  return { valid: true, bankCode };
}

/**
 * Get bank name from bank code
 */
export function getBankNameFromCode(bankCode: string): string {
  const bankNames: Record<string, string> = {
    "00010": "T.C. Ziraat Bankası",
    "00012": "Türkiye Halk Bankası",
    "00015": "Türkiye Vakıflar Bankası",
    "00046": "Akbank",
    "00062": "Garanti BBVA",
    "00064": "Türkiye İş Bankası",
    "00067": "Yapı ve Kredi Bankası",
    "00099": "ING Bank",
    "00111": "QNB Finansbank",
    "00134": "Denizbank",
    "00203": "Albaraka Türk",
    "00205": "Kuveyt Türk",
    "00206": "Türkiye Finans",
  };

  return bankNames[bankCode] || `Banka (${bankCode})`;
}

/**
 * Check if payment type is supported by bank
 */
export function isPaymentTypeSupported(bankCode: string, paymentType: PaymentType): boolean {
  // All major Turkish banks support FAST and EFT
  const universalTypes: PaymentType[] = ["FAST", "EFT", "HAVALE"];

  if (universalTypes.includes(paymentType)) {
    return true;
  }

  // Bank-specific payment types
  const bankSpecificTypes: Record<string, PaymentType[]> = {
    "00062": ["TR_KAREKOD"], // Garanti
    "00064": ["TR_KAREKOD", "MOBILE_WALLET"], // İş Bankası
    "00046": ["TR_KAREKOD", "MOBILE_WALLET"], // Akbank (Wing)
    "00067": ["TR_KAREKOD", "MOBILE_WALLET"], // Yapı Kredi (Parapara)
    "00010": ["TR_KAREKOD"], // Ziraat
    "00015": ["TR_KAREKOD"], // Vakıfbank
    "00111": ["TR_KAREKOD", "MOBILE_WALLET"], // QNB Finansbank (Enpara)
  };

  return bankSpecificTypes[bankCode]?.includes(paymentType) || false;
}
