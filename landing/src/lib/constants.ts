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
      "Mali sorularınıza anında cevap veren, faturalarınızı analiz eden ve öneriler sunan AI destekli asistan.",
  },
  {
    icon: "FileCheck" as const,
    title: "GİB E-Fatura / E-Defter / E-Arşiv",
    description:
      "GİB mevzuatına tam uyumlu elektronik fatura, defter ve arşiv işlemleri. VKN doğrulama ve KDV kontrolü dahil.",
  },
  {
    icon: "Shield" as const,
    title: "MASAK STR İzleme & Denetim",
    description:
      "Şüpheli işlem bildirimi (STR), eşik değeri takibi, smurfing tespiti ve otomatik uyarı sistemi.",
  },
  {
    icon: "Building2" as const,
    title: "Çoklu Firma Yönetimi",
    description:
      "Yüzlerce müşterinizi tek panelden yönetin. Firma bazlı raporlama, risk skorlama ve toplu işlem desteği.",
  },
  {
    icon: "Landmark" as const,
    title: "7 Banka Entegrasyonu (PSD2)",
    description:
      "Ziraat, Garanti, İş Bankası, Yapı Kredi, Vakıfbank, QNB, Akbank ile otomatik hesap senkronizasyonu.",
  },
  {
    icon: "Lock" as const,
    title: "KVKK Uyumluluğu",
    description:
      "Kişisel veri envanterleri, erişim talepleri, silme işlemleri ve ihlal yönetimi. Tam KVKK denetim izleri.",
  },
  {
    icon: "BarChart3" as const,
    title: "ML Tabanlı Risk Skorlama",
    description:
      "Isolation Forest anomali tespiti, Benford Yasası analizi, dairesel işlem ve naylon fatura kontrolü.",
  },
  {
    icon: "MessageSquare" as const,
    title: "AI Sohbet Asistanı",
    description:
      "Finansal sorularınıza Türkçe doğal dilde cevap veren, mevzuat bilen akıllı sohbet robotu.",
  },
  {
    icon: "Search" as const,
    title: "RAG Semantik Belge Arama",
    description:
      "Yüklenen belgeleri yapay zeka ile anlamlandıran ve ilişkili sonuçlara ulaşan akıllı arama motoru.",
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
      "10 farklı GİB denetim tetikleyicisini önceden kontrol edin. Denetim riskinizi skorlayın.",
  },
  {
    icon: "Calendar" as const,
    title: "Zamanlanmış Raporlar & Vergi Takvimi",
    description:
      "Beyanname takvimi, otomatik rapor oluşturma, vergi süreci hatırlatıcıları ve zamanlanmış gönderim.",
  },
  {
    icon: "Users" as const,
    title: "Müşteri Portalı",
    description:
      "Müşterilerinize özel güvenli portal. Belge paylaşımı, fatura görüntülemesi ve işlem takibi.",
  },
];

export const STATS = [
  { value: 7, label: "Banka Entegrasyonu" },
  { value: 13, suffix: "+", label: "Temel Modül" },
  { value: 10, label: "GİB Denetim Kontrolü" },
  { value: 99.9, prefix: "%", label: "Çalışma Süresi" },
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
      "MASAK STR izleme",
      "7 banka entegrasyonu",
      "ML risk skorlama",
      "AI sohbet asistanı",
      "RAG belge arama",
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
      "Sınırsız firma",
      "Çapraz firma eşleştirme",
      "GİB denetim ön kontrolü",
      "Sektörel benchmark",
      "KVKK tam uyumluluk",
      "Müşteri portalı",
      "Zamanlanmış raporlar",
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
