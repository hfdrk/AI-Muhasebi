export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3010";
export const LOGIN_URL = `${APP_URL}/auth/login`;
export const REGISTER_URL = `${APP_URL}/auth/register`;

export const COLORS = {
  primary: "#1e3a5f",
  primaryDark: "#152d4a",
  primaryLight: "#2a5080",
  accent: "#0d9488",
  accentDark: "#0f766e",
  accentLight: "#14b8a6",
  text: {
    primary: "#0f172a",
    secondary: "#475569",
    muted: "#64748b",
    inverse: "#ffffff",
  },
  background: "#ffffff",
  backgroundAlt: "#f8fafc",
  backgroundDark: "#0f172a",
  border: "#e2e8f0",
  gray: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
  },
  success: "#059669",
};

export const FEATURES = [
  {
    icon: "Brain" as const,
    title: "Yapay Zeka Muhasebe Asistanı",
    description:
      "Mali sorularınıza anında cevap veren, faturalarınızı analiz eden AI asistan. RAG belge arama ve doğal dilde Türkçe sohbet.",
  },
  {
    icon: "FileCheck" as const,
    title: "GİB E-Fatura / E-Defter / E-Arşiv",
    description:
      "GİB mevzuatına tam uyumlu elektronik fatura, defter ve arşiv işlemleri. VKN doğrulama, KDV kontrolü ve UBL 2.1 formatı.",
  },
  {
    icon: "Shield" as const,
    title: "MASAK STR & Kırmızı Bayrak Kontrolü",
    description:
      "STR bildirimi, 12 kırmızı bayrak kontrolü (RF-001–RF-012), eşik takibi, smurfing tespiti ve KURGAN izleme.",
  },
  {
    icon: "Building2" as const,
    title: "Mali Müşavir Çoklu Firma Yönetimi",
    description:
      "SMMM/YMM lisans takibi, TÜRMOB kaydı, sigorta yönetimi. Yüzlerce firmayı tek panelden yönetin.",
  },
  {
    icon: "Landmark" as const,
    title: "7 Banka + 3 Muhasebe Yazılımı",
    description:
      "Ziraat, Garanti, İş Bankası, Yapı Kredi, Vakıfbank, QNB, Akbank (PSD2) ve ETA, Logo, Mikro entegrasyonu.",
  },
  {
    icon: "Lock" as const,
    title: "KVKK Tam Uyumluluk Modülü",
    description:
      "Onay yönetimi, veri erişim/silme talepleri, ihlal bildirimi, denetim kayıtları. 2FA ve IP kısıtlaması ile güvenlik.",
  },
  {
    icon: "BarChart3" as const,
    title: "ML Tabanlı Risk Skorlama",
    description:
      "Isolation Forest anomali tespiti, Benford Yasası, dairesel işlem, naylon fatura ve sektörel benchmark kontrolü.",
  },
  {
    icon: "TrendingUp" as const,
    title: "Nakit Akış & Finansal Araçlar",
    description:
      "Nakit akış tahmini, çek/senet takibi, döviz kurları (15+ para birimi), ödeme hatırlatma ve tekrar eden faturalar.",
  },
  {
    icon: "FileText" as const,
    title: "Ba-Bs Formları & Beyanname",
    description:
      "Ba-Bs form oluşturma, beyanname hazırlama, vergi hesaplama ve GİB gönderim iş akışı.",
  },
  {
    icon: "GitCompareArrows" as const,
    title: "Çapraz Firma Eşleştirme",
    description:
      "Firmalar arası şüpheli işlemleri, naylon fatura ağlarını ve sahte belgeleri otomatik tespit edin.",
  },
  {
    icon: "ClipboardCheck" as const,
    title: "GİB Denetim Ön Kontrolü",
    description:
      "10 farklı GİB denetim tetikleyicisini (AT-001–AT-010) önceden kontrol edin. Denetim riskinizi skorlayın.",
  },
  {
    icon: "PieChart" as const,
    title: "Analitik & Tahminleme",
    description:
      "Finansal trendler, risk trendleri, portföy analizi, gelir/gider tahmini ve zamanlanmış raporlar.",
  },
  {
    icon: "ScanLine" as const,
    title: "OCR & Belge Yapay Zekası",
    description:
      "Tesseract, AWS Textract ve Google Vision ile belge tarama. Otomatik alan çıkarma ve sınıflandırma.",
  },
  {
    icon: "Users" as const,
    title: "Müşteri Portalı & Mesajlaşma",
    description:
      "Müşterilerinize özel güvenli portal, belge paylaşımı, fatura görüntülemesi. Dahili mesajlaşma ve görev takibi.",
  },
  {
    icon: "Calendar" as const,
    title: "Vergi Yönetimi & TMS Uyumu",
    description:
      "KDV optimizasyonu, TMS uyumlu mali tablo hazırlama, vergi takvimi hatırlatıcıları ve beyanname takibi.",
  },
];

export const STATS = [
  { value: 10, label: "Entegrasyon (7 Banka + 3 Yazılım)" },
  { value: 25, suffix: "+", label: "Platform Modülü" },
  { value: 12, label: "MASAK Kırmızı Bayrak Kontrolü" },
  { value: 10, label: "GİB Denetim Ön Kontrolü" },
];

export const STEPS = [
  {
    number: "01",
    icon: "UserPlus" as const,
    title: "Ücretsiz Kayıt Olun",
    description:
      "Email adresiniz ve ofis bilgileriniz ile 2 dakikada kayıt olun. Kredi kartı gerekmez.",
  },
  {
    number: "02",
    icon: "Link2" as const,
    title: "Entegrasyonları Bağlayın",
    description:
      "Banka hesaplarınızı ve GİB sisteminizi entegre edin. Otomatik veri senkronizasyonu başlasın.",
  },
  {
    number: "03",
    icon: "Sparkles" as const,
    title: "AI ile Çalışmaya Başlayın",
    description:
      "Yapay zeka faturalarınızı analiz etsin, riskleri tespit etsin ve uyumluluk kontrollerini otomatik yapsın.",
  },
];

export const PRICING_PLANS = [
  {
    name: "Başlangıç",
    price: "Ücretsiz",
    subtitle: "Bireysel mali müşavirler için",
    features: [
      "1 firma yönetimi",
      "E-Fatura gönderim/alım",
      "Temel risk analizi",
      "Ba-Bs form oluşturma",
      "OCR belge tarama",
      "Döviz kuru takibi",
      "5 GB belge depolama",
      "Email destek",
    ],
    cta: "Ücretsiz Başlayın",
    popular: false,
  },
  {
    name: "Profesyonel",
    price: "İletişime Geçin",
    subtitle: "Büyüyen mali müşavirlik ofisleri için",
    features: [
      "50 firma yönetimi",
      "GİB E-Fatura / E-Defter / E-Arşiv",
      "MASAK STR & kırmızı bayrak izleme",
      "7 banka + 3 muhasebe yazılımı",
      "ML risk skorlama & anomali tespiti",
      "AI asistan & RAG belge arama",
      "Nakit akış tahmini & çek/senet takibi",
      "Beyanname hazırlama & vergi hesaplama",
      "Ödeme hatırlatma & tekrar eden faturalar",
      "Analitik & finansal trendler",
      "50 GB belge depolama",
      "Öncelikli destek",
    ],
    cta: "Ücretsiz Deneyin",
    popular: true,
  },
  {
    name: "Kurumsal",
    price: "Özel Fiyat",
    subtitle: "Büyük ölçekli ofisler ve holdingler için",
    features: [
      "Sınırsız firma yönetimi",
      "Çapraz firma eşleştirme & naylon fatura tespiti",
      "GİB denetim ön kontrolü (AT-001–AT-010)",
      "Sektörel benchmark (NACE kodlu)",
      "KVKK tam uyumluluk modülü",
      "KURGAN izleme sistemi",
      "Müşteri portalı & mesajlaşma",
      "Mali müşavir çoklu firma paneli",
      "Zamanlanmış raporlar & tahminleme",
      "Özel entegrasyon desteği",
      "7/24 öncelikli destek",
    ],
    cta: "İletişime Geçin",
    popular: false,
  },
];

export const NAV_LINKS = [
  { label: "Özellikler", href: "#ozellikler" },
  { label: "Nasıl Çalışır", href: "#nasil-calisir" },
  { label: "Fiyatlandırma", href: "#fiyatlandirma" },
];

export const COMPLIANCE_BADGES = [
  "GİB",
  "MASAK",
  "KVKK",
  "TMS/TFRS",
  "BDDK",
  "E-Fatura",
  "E-Defter",
  "E-Arşiv",
];
