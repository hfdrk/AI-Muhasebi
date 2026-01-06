/**
 * Turkish Accounting Knowledge Base
 *
 * Comprehensive knowledge base for Turkish accounting standards, regulations, and practices.
 * This serves as the foundation for the AI-powered Turkish Accounting Assistant.
 *
 * Includes:
 * - Tek Düzen Hesap Planı (Uniform Chart of Accounts)
 * - Turkish Accounting Standards (TMS/TFRS)
 * - Tax regulations and rates
 * - Common accounting scenarios
 * - Turkish financial terminology
 */

// =============================================================================
// TEK DÜZEN HESAP PLANI (Turkish Uniform Chart of Accounts)
// =============================================================================

export interface HesapKodu {
  kod: string;
  isim: string;
  ingilizce: string;
  grup: string;
  altGrup?: string;
  aciklama: string;
  ozellikler: {
    borcCalisan: boolean; // Normally debit balance
    alacakCalisan: boolean; // Normally credit balance
    bilancoHesabi: boolean;
    gelirTablosuHesabi: boolean;
  };
  ornekKullanimlar: string[];
  iliskiliHesaplar: string[];
}

export const HESAP_GRUPLARI = {
  "1": { isim: "DÖNEN VARLIKLAR", ingilizce: "Current Assets" },
  "2": { isim: "DURAN VARLIKLAR", ingilizce: "Non-Current Assets" },
  "3": { isim: "KISA VADELİ YABANCI KAYNAKLAR", ingilizce: "Short-Term Liabilities" },
  "4": { isim: "UZUN VADELİ YABANCI KAYNAKLAR", ingilizce: "Long-Term Liabilities" },
  "5": { isim: "ÖZ KAYNAKLAR", ingilizce: "Equity" },
  "6": { isim: "GELİR TABLOSU HESAPLARI", ingilizce: "Income Statement Accounts" },
  "7": { isim: "MALİYET HESAPLARI", ingilizce: "Cost Accounts" },
  "8": { isim: "SERBEST", ingilizce: "Free (Industry-specific)" },
  "9": { isim: "NAZIM HESAPLAR", ingilizce: "Memorandum Accounts" },
};

// Most commonly used accounts in Turkish SME accounting
export const TEK_DUZEN_HESAP_PLANI: HesapKodu[] = [
  // 10 - HAZIR DEĞERLER (Cash and Cash Equivalents)
  {
    kod: "100",
    isim: "KASA",
    ingilizce: "Cash",
    grup: "1",
    altGrup: "10 - HAZIR DEĞERLER",
    aciklama: "İşletmenin elinde bulunan Türk Lirası ve yabancı paralar",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Nakit satış tahsilatı",
      "Peşin alış ödemesi",
      "Personel avans ödemesi",
      "Küçük masraf ödemeleri",
    ],
    iliskiliHesaplar: ["600", "320", "335", "102"],
  },
  {
    kod: "101",
    isim: "ALINAN ÇEKLER",
    ingilizce: "Checks Received",
    grup: "1",
    altGrup: "10 - HAZIR DEĞERLER",
    aciklama: "Gerçek ve tüzel kişilerden alınan çekler",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Müşteriden alınan vadeli çek",
      "Alacak tahsilatında çek alma",
    ],
    iliskiliHesaplar: ["120", "600", "102"],
  },
  {
    kod: "102",
    isim: "BANKALAR",
    ingilizce: "Banks",
    grup: "1",
    altGrup: "10 - HAZIR DEĞERLER",
    aciklama: "Bankalardaki mevduatlar (vadesiz, vadeli, döviz)",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Havale ile tahsilat",
      "EFT ile ödeme",
      "Banka kredisi kullanımı",
      "Faiz geliri tahakkuku",
    ],
    iliskiliHesaplar: ["100", "120", "320", "300", "642"],
  },
  {
    kod: "103",
    isim: "VERİLEN ÇEKLER VE ÖDEME EMİRLERİ (-)",
    ingilizce: "Checks Given and Payment Orders",
    grup: "1",
    altGrup: "10 - HAZIR DEĞERLER",
    aciklama: "İşletmenin verdiği çekler ve ödeme emirleri (aktifi düzenleyici)",
    ozellikler: {
      borcCalisan: false,
      alacakCalisan: true,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Tedarikçiye çek verme",
      "Vadeli çek düzenleme",
    ],
    iliskiliHesaplar: ["320", "102"],
  },

  // 12 - TİCARİ ALACAKLAR (Trade Receivables)
  {
    kod: "120",
    isim: "ALICILAR",
    ingilizce: "Trade Receivables",
    grup: "1",
    altGrup: "12 - TİCARİ ALACAKLAR",
    aciklama: "İşletmenin faaliyet konusunu oluşturan mal ve hizmet satışından kaynaklanan senetsiz alacaklar",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Kredili satış yapıldığında",
      "Hizmet faturası kesildiğinde",
      "Müşteri tahsilatı yapıldığında (alacak)",
    ],
    iliskiliHesaplar: ["600", "602", "391", "100", "102"],
  },
  {
    kod: "121",
    isim: "ALACAK SENETLERİ",
    ingilizce: "Notes Receivable",
    grup: "1",
    altGrup: "12 - TİCARİ ALACAKLAR",
    aciklama: "Alınan senetler ve poliçeler",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Müşteriden senet alma",
      "Alacağı senede bağlama",
    ],
    iliskiliHesaplar: ["120", "600", "102"],
  },
  {
    kod: "126",
    isim: "VERİLEN DEPOZİTO VE TEMİNATLAR",
    ingilizce: "Deposits and Guarantees Given",
    grup: "1",
    altGrup: "12 - TİCARİ ALACAKLAR",
    aciklama: "Üçüncü kişilere verilen depozito ve teminatlar",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Kira depozitosu verme",
      "İhale teminatı yatırma",
    ],
    iliskiliHesaplar: ["100", "102"],
  },
  {
    kod: "129",
    isim: "ŞÜPHELİ TİCARİ ALACAKLAR",
    ingilizce: "Doubtful Trade Receivables",
    grup: "1",
    altGrup: "12 - TİCARİ ALACAKLAR",
    aciklama: "Tahsili şüpheli hale gelen ticari alacaklar",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Vadesi geçmiş alacak için karşılık ayırma",
      "İcra takibine giren alacaklar",
    ],
    iliskiliHesaplar: ["120", "654", "122"],
  },

  // 15 - STOKLAR (Inventories)
  {
    kod: "150",
    isim: "İLK MADDE VE MALZEME",
    ingilizce: "Raw Materials",
    grup: "1",
    altGrup: "15 - STOKLAR",
    aciklama: "Üretimde kullanılacak hammadde ve malzemeler",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Hammadde alışı",
      "Üretime hammadde sevki",
    ],
    iliskiliHesaplar: ["320", "391", "710"],
  },
  {
    kod: "152",
    isim: "MAMULLER",
    ingilizce: "Finished Goods",
    grup: "1",
    altGrup: "15 - STOKLAR",
    aciklama: "Üretimi tamamlanmış ve satışa hazır ürünler",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Üretimden mamul girişi",
      "Mamul satışı",
    ],
    iliskiliHesaplar: ["620", "151", "711"],
  },
  {
    kod: "153",
    isim: "TİCARİ MALLAR",
    ingilizce: "Merchandise",
    grup: "1",
    altGrup: "15 - STOKLAR",
    aciklama: "Satılmak amacıyla alınan ve üzerinde değişiklik yapılmayan mallar",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Ticari mal alışı",
      "Mal satış maliyeti",
      "Stok sayımı",
    ],
    iliskiliHesaplar: ["320", "391", "621", "600"],
  },
  {
    kod: "157",
    isim: "DİĞER STOKLAR",
    ingilizce: "Other Inventories",
    grup: "1",
    altGrup: "15 - STOKLAR",
    aciklama: "Diğer gruplara girmeyen stoklar",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Ambalaj malzemesi",
      "Büro malzemeleri stoğu",
    ],
    iliskiliHesaplar: ["320", "770"],
  },

  // 19 - DİĞER DÖNEN VARLIKLAR
  {
    kod: "190",
    isim: "DEVREDEN KDV",
    ingilizce: "VAT Carried Forward",
    grup: "1",
    altGrup: "19 - DİĞER DÖNEN VARLIKLAR",
    aciklama: "İndirilemeyen ve gelecek dönemlere devreden KDV",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "KDV beyannamesi sonrası devreden KDV",
      "İade alınacak KDV",
    ],
    iliskiliHesaplar: ["191", "391", "360"],
  },
  {
    kod: "191",
    isim: "İNDİRİLECEK KDV",
    ingilizce: "VAT Deductible",
    grup: "1",
    altGrup: "19 - DİĞER DÖNEN VARLIKLAR",
    aciklama: "Alışlar üzerinden hesaplanan ve indirilecek olan KDV",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Mal/hizmet alışlarında ödenen KDV",
      "Sabit kıymet alımlarında KDV",
    ],
    iliskiliHesaplar: ["153", "255", "320", "391"],
  },
  {
    kod: "193",
    isim: "PEŞİN ÖDENEN VERGİLER VE FONLAR",
    ingilizce: "Prepaid Taxes",
    grup: "1",
    altGrup: "19 - DİĞER DÖNEN VARLIKLAR",
    aciklama: "Geçici vergi, stopaj gibi peşin ödenen vergiler",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Geçici vergi ödemesi",
      "Stopaj kesintisi",
    ],
    iliskiliHesaplar: ["102", "370", "371"],
  },
  {
    kod: "195",
    isim: "İŞ AVANSLARI",
    ingilizce: "Work Advances",
    grup: "1",
    altGrup: "19 - DİĞER DÖNEN VARLIKLAR",
    aciklama: "Personel ve diğer kişilere verilen iş avansları",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Personele yolluk avansı",
      "Satın alma avansı",
    ],
    iliskiliHesaplar: ["100", "335", "770"],
  },

  // 25 - MADDİ DURAN VARLIKLAR (Tangible Fixed Assets)
  {
    kod: "252",
    isim: "BİNALAR",
    ingilizce: "Buildings",
    grup: "2",
    altGrup: "25 - MADDİ DURAN VARLIKLAR",
    aciklama: "İşletmeye ait her türlü bina ve yapı",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Fabrika binası alımı",
      "Ofis binası inşaatı",
    ],
    iliskiliHesaplar: ["102", "320", "257"],
  },
  {
    kod: "253",
    isim: "TESİS, MAKİNE VE CİHAZLAR",
    ingilizce: "Plant, Machinery and Equipment",
    grup: "2",
    altGrup: "25 - MADDİ DURAN VARLIKLAR",
    aciklama: "Üretimde kullanılan tesis, makine ve cihazlar",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Üretim makinesi alımı",
      "CNC tezgahı alımı",
    ],
    iliskiliHesaplar: ["102", "320", "257", "730"],
  },
  {
    kod: "254",
    isim: "TAŞITLAR",
    ingilizce: "Vehicles",
    grup: "2",
    altGrup: "25 - MADDİ DURAN VARLIKLAR",
    aciklama: "İşletme faaliyetlerinde kullanılan taşıtlar",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Şirket aracı alımı",
      "Nakliye aracı alımı",
    ],
    iliskiliHesaplar: ["102", "320", "257", "770"],
  },
  {
    kod: "255",
    isim: "DEMİRBAŞLAR",
    ingilizce: "Furniture and Fixtures",
    grup: "2",
    altGrup: "25 - MADDİ DURAN VARLIKLAR",
    aciklama: "Büro mobilyaları, bilgisayar, ofis makineleri",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Bilgisayar alımı",
      "Ofis mobilyası alımı",
      "Klima alımı",
    ],
    iliskiliHesaplar: ["102", "320", "257", "770"],
  },
  {
    kod: "257",
    isim: "BİRİKMİŞ AMORTİSMANLAR (-)",
    ingilizce: "Accumulated Depreciation",
    grup: "2",
    altGrup: "25 - MADDİ DURAN VARLIKLAR",
    aciklama: "Maddi duran varlıklar için ayrılan birikmiş amortisman",
    ozellikler: {
      borcCalisan: false,
      alacakCalisan: true,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Yıllık amortisman ayırma",
      "Hızlandırılmış amortisman",
    ],
    iliskiliHesaplar: ["252", "253", "254", "255", "730", "770"],
  },

  // 26 - MADDİ OLMAYAN DURAN VARLIKLAR
  {
    kod: "260",
    isim: "HAKLAR",
    ingilizce: "Rights",
    grup: "2",
    altGrup: "26 - MADDİ OLMAYAN DURAN VARLIKLAR",
    aciklama: "Patent, lisans, telif hakkı, franchise hakları",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Yazılım lisansı alımı",
      "Patent alımı",
    ],
    iliskiliHesaplar: ["102", "320", "268"],
  },
  {
    kod: "264",
    isim: "ÖZEL MALİYETLER",
    ingilizce: "Leasehold Improvements",
    grup: "2",
    altGrup: "26 - MADDİ OLMAYAN DURAN VARLIKLAR",
    aciklama: "Kiralanan gayrimenkullere yapılan iyileştirme giderleri",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Kiralık ofis tadilatı",
      "Mağaza dekorasyonu",
    ],
    iliskiliHesaplar: ["102", "320", "268"],
  },

  // 30 - MALİ BORÇLAR (Financial Liabilities)
  {
    kod: "300",
    isim: "BANKA KREDİLERİ",
    ingilizce: "Bank Loans",
    grup: "3",
    altGrup: "30 - MALİ BORÇLAR",
    aciklama: "Bankalardan alınan kısa vadeli krediler",
    ozellikler: {
      borcCalisan: false,
      alacakCalisan: true,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "İşletme kredisi kullanımı",
      "Rotatif kredi",
      "Kredi taksit ödemesi",
    ],
    iliskiliHesaplar: ["102", "780"],
  },
  {
    kod: "303",
    isim: "UZUN VADELİ KREDİLERİN ANA PARA TAKSİTLERİ",
    ingilizce: "Current Portion of Long-Term Debt",
    grup: "3",
    altGrup: "30 - MALİ BORÇLAR",
    aciklama: "Uzun vadeli kredilerin bir yıl içinde ödenecek kısımları",
    ozellikler: {
      borcCalisan: false,
      alacakCalisan: true,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Yatırım kredisi taksitleri",
      "Makine kredisi ödemeleri",
    ],
    iliskiliHesaplar: ["400", "102"],
  },

  // 32 - TİCARİ BORÇLAR (Trade Payables)
  {
    kod: "320",
    isim: "SATICILAR",
    ingilizce: "Trade Payables",
    grup: "3",
    altGrup: "32 - TİCARİ BORÇLAR",
    aciklama: "Mal ve hizmet alımlarından kaynaklanan senetsiz borçlar",
    ozellikler: {
      borcCalisan: false,
      alacakCalisan: true,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Kredili mal alışı",
      "Hizmet faturası alınması",
      "Tedarikçi ödemesi",
    ],
    iliskiliHesaplar: ["153", "191", "100", "102", "770"],
  },
  {
    kod: "321",
    isim: "BORÇ SENETLERİ",
    ingilizce: "Notes Payable",
    grup: "3",
    altGrup: "32 - TİCARİ BORÇLAR",
    aciklama: "Tedarikçilere verilen senetler",
    ozellikler: {
      borcCalisan: false,
      alacakCalisan: true,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Alışlar için senet verme",
      "Borcun senede bağlanması",
    ],
    iliskiliHesaplar: ["320", "102"],
  },
  {
    kod: "326",
    isim: "ALINAN DEPOZİTO VE TEMİNATLAR",
    ingilizce: "Deposits and Guarantees Received",
    grup: "3",
    altGrup: "32 - TİCARİ BORÇLAR",
    aciklama: "Üçüncü kişilerden alınan depozito ve teminatlar",
    ozellikler: {
      borcCalisan: false,
      alacakCalisan: true,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Kiracıdan depozito alma",
      "Teminat alma",
    ],
    iliskiliHesaplar: ["100", "102"],
  },

  // 33 - DİĞER BORÇLAR
  {
    kod: "335",
    isim: "PERSONELE BORÇLAR",
    ingilizce: "Payables to Personnel",
    grup: "3",
    altGrup: "33 - DİĞER BORÇLAR",
    aciklama: "Personele ödenecek ücret ve diğer borçlar",
    ozellikler: {
      borcCalisan: false,
      alacakCalisan: true,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Maaş tahakkuku",
      "İkramiye borcu",
      "Kıdem tazminatı borcu",
    ],
    iliskiliHesaplar: ["770", "100", "102", "360", "361"],
  },
  {
    kod: "336",
    isim: "DİĞER ÇEŞİTLİ BORÇLAR",
    ingilizce: "Other Payables",
    grup: "3",
    altGrup: "33 - DİĞER BORÇLAR",
    aciklama: "Diğer gruplara girmeyen borçlar",
    ozellikler: {
      borcCalisan: false,
      alacakCalisan: true,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Ortaklara borçlar",
      "SSK primi borcu",
    ],
    iliskiliHesaplar: ["100", "102", "361"],
  },

  // 36 - ÖDENECEK VERGİ VE DİĞER YÜKÜMLÜLÜKLER
  {
    kod: "360",
    isim: "ÖDENECEK VERGİ VE FONLAR",
    ingilizce: "Taxes and Funds Payable",
    grup: "3",
    altGrup: "36 - ÖDENECEK VERGİ VE DİĞER YÜKÜMLÜLÜKLER",
    aciklama: "Ödenecek her türlü vergi ve fonlar",
    ozellikler: {
      borcCalisan: false,
      alacakCalisan: true,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "KDV beyannamesi tahakkuku",
      "Muhtasar vergisi",
      "Damga vergisi",
    ],
    iliskiliHesaplar: ["391", "770", "102"],
  },
  {
    kod: "361",
    isim: "ÖDENECEK SOSYAL GÜVENLİK KESİNTİLERİ",
    ingilizce: "Social Security Payables",
    grup: "3",
    altGrup: "36 - ÖDENECEK VERGİ VE DİĞER YÜKÜMLÜLÜKLER",
    aciklama: "SGK primleri ve diğer sosyal güvenlik kesintileri",
    ozellikler: {
      borcCalisan: false,
      alacakCalisan: true,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "SGK işçi payı",
      "SGK işveren payı",
      "İşsizlik sigortası",
    ],
    iliskiliHesaplar: ["335", "770", "102"],
  },

  // 39 - DİĞER KISA VADELİ YABANCI KAYNAKLAR
  {
    kod: "391",
    isim: "HESAPLANAN KDV",
    ingilizce: "VAT Calculated",
    grup: "3",
    altGrup: "39 - DİĞER KISA VADELİ YABANCI KAYNAKLAR",
    aciklama: "Satışlar üzerinden hesaplanan KDV",
    ozellikler: {
      borcCalisan: false,
      alacakCalisan: true,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Satış faturasında KDV hesaplama",
      "Hizmet faturasında KDV",
    ],
    iliskiliHesaplar: ["600", "602", "120", "191", "360"],
  },

  // 40 - UZUN VADELİ YABANCI KAYNAKLAR
  {
    kod: "400",
    isim: "BANKA KREDİLERİ",
    ingilizce: "Long-Term Bank Loans",
    grup: "4",
    altGrup: "40 - MALİ BORÇLAR",
    aciklama: "Vadesi bir yıldan uzun banka kredileri",
    ozellikler: {
      borcCalisan: false,
      alacakCalisan: true,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Yatırım kredisi kullanımı",
      "Uzun vadeli işletme kredisi",
    ],
    iliskiliHesaplar: ["102", "303", "780"],
  },

  // 50 - ÖZ KAYNAKLAR (Equity)
  {
    kod: "500",
    isim: "SERMAYE",
    ingilizce: "Capital",
    grup: "5",
    altGrup: "50 - ÖDENMİŞ SERMAYE",
    aciklama: "Ortaklar tarafından taahhüt edilen sermaye",
    ozellikler: {
      borcCalisan: false,
      alacakCalisan: true,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Şirket kuruluşu",
      "Sermaye artırımı",
    ],
    iliskiliHesaplar: ["501", "100", "102"],
  },
  {
    kod: "501",
    isim: "ÖDENMEMİŞ SERMAYE (-)",
    ingilizce: "Uncalled Capital",
    grup: "5",
    altGrup: "50 - ÖDENMİŞ SERMAYE",
    aciklama: "Ortakların henüz ödemediği sermaye taahhütleri",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Sermaye taahhüdü kaydı",
      "Ortakların sermaye ödemesi",
    ],
    iliskiliHesaplar: ["500", "100", "102"],
  },
  {
    kod: "570",
    isim: "GEÇMİŞ YILLAR KARLARI",
    ingilizce: "Retained Earnings",
    grup: "5",
    altGrup: "57 - GEÇMİŞ YILLAR KARLARI",
    aciklama: "Geçmiş faaliyet dönemlerinde elde edilen ve dağıtılmayan karlar",
    ozellikler: {
      borcCalisan: false,
      alacakCalisan: true,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Dönem sonu kar devri",
      "Kar dağıtımı",
    ],
    iliskiliHesaplar: ["590", "331"],
  },
  {
    kod: "580",
    isim: "GEÇMİŞ YILLAR ZARARLARI (-)",
    ingilizce: "Accumulated Losses",
    grup: "5",
    altGrup: "58 - GEÇMİŞ YILLAR ZARARLARI",
    aciklama: "Geçmiş dönemlerde oluşan ve karşılanmamış zararlar",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Dönem sonu zarar devri",
      "Zarar mahsubu",
    ],
    iliskiliHesaplar: ["591", "570"],
  },
  {
    kod: "590",
    isim: "DÖNEM NET KARI",
    ingilizce: "Net Income",
    grup: "5",
    altGrup: "59 - DÖNEM NET KARI/ZARARI",
    aciklama: "Cari dönemde elde edilen net kar",
    ozellikler: {
      borcCalisan: false,
      alacakCalisan: true,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Dönem sonu kapanış",
      "Kar/zarar hesabı kapatma",
    ],
    iliskiliHesaplar: ["690", "570"],
  },
  {
    kod: "591",
    isim: "DÖNEM NET ZARARI (-)",
    ingilizce: "Net Loss",
    grup: "5",
    altGrup: "59 - DÖNEM NET KARI/ZARARI",
    aciklama: "Cari dönemde oluşan net zarar",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: true,
      gelirTablosuHesabi: false,
    },
    ornekKullanimlar: [
      "Dönem sonu zarar kaydı",
      "Kar/zarar hesabı kapatma",
    ],
    iliskiliHesaplar: ["690", "580"],
  },

  // 60 - BRÜT SATIŞLAR (Gross Sales)
  {
    kod: "600",
    isim: "YURTİÇİ SATIŞLAR",
    ingilizce: "Domestic Sales",
    grup: "6",
    altGrup: "60 - BRÜT SATIŞLAR",
    aciklama: "Yurt içinde yapılan mal ve hizmet satışları",
    ozellikler: {
      borcCalisan: false,
      alacakCalisan: true,
      bilancoHesabi: false,
      gelirTablosuHesabi: true,
    },
    ornekKullanimlar: [
      "Mal satışı",
      "Hizmet satışı",
      "Peşin satış",
      "Kredili satış",
    ],
    iliskiliHesaplar: ["120", "100", "102", "391"],
  },
  {
    kod: "601",
    isim: "YURTDIŞI SATIŞLAR",
    ingilizce: "Export Sales",
    grup: "6",
    altGrup: "60 - BRÜT SATIŞLAR",
    aciklama: "İhracat yoluyla yapılan satışlar",
    ozellikler: {
      borcCalisan: false,
      alacakCalisan: true,
      bilancoHesabi: false,
      gelirTablosuHesabi: true,
    },
    ornekKullanimlar: [
      "İhracat satışı",
      "Serbest bölge satışı",
    ],
    iliskiliHesaplar: ["120", "102"],
  },
  {
    kod: "602",
    isim: "DİĞER GELİRLER",
    ingilizce: "Other Revenues",
    grup: "6",
    altGrup: "60 - BRÜT SATIŞLAR",
    aciklama: "Ana faaliyet dışı gelirler (kira, komisyon vb.)",
    ozellikler: {
      borcCalisan: false,
      alacakCalisan: true,
      bilancoHesabi: false,
      gelirTablosuHesabi: true,
    },
    ornekKullanimlar: [
      "Kira geliri",
      "Komisyon geliri",
    ],
    iliskiliHesaplar: ["120", "100", "102"],
  },

  // 61 - SATIŞ İNDİRİMLERİ
  {
    kod: "610",
    isim: "SATIŞTAN İADELER (-)",
    ingilizce: "Sales Returns",
    grup: "6",
    altGrup: "61 - SATIŞ İNDİRİMLERİ",
    aciklama: "Satılan malların iade edilmesi",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: false,
      gelirTablosuHesabi: true,
    },
    ornekKullanimlar: [
      "Müşteri iadesi",
      "Hatalı mal iadesi",
    ],
    iliskiliHesaplar: ["120", "391", "153"],
  },
  {
    kod: "611",
    isim: "SATIŞ İSKONTOLARI (-)",
    ingilizce: "Sales Discounts",
    grup: "6",
    altGrup: "61 - SATIŞ İNDİRİMLERİ",
    aciklama: "Satışlarda yapılan iskontolar",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: false,
      gelirTablosuHesabi: true,
    },
    ornekKullanimlar: [
      "Erken ödeme iskontosu",
      "Miktar iskontosu",
    ],
    iliskiliHesaplar: ["120", "391"],
  },

  // 62 - SATIŞLARIN MALİYETİ
  {
    kod: "620",
    isim: "SATILAN MAMÜLLER MALİYETİ (-)",
    ingilizce: "Cost of Finished Goods Sold",
    grup: "6",
    altGrup: "62 - SATIŞLARIN MALİYETİ",
    aciklama: "Satılan mamullerin üretim maliyeti",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: false,
      gelirTablosuHesabi: true,
    },
    ornekKullanimlar: [
      "Mamul satış maliyeti",
      "Üretim maliyeti aktarımı",
    ],
    iliskiliHesaplar: ["152", "711"],
  },
  {
    kod: "621",
    isim: "SATILAN TİCARİ MALLAR MALİYETİ (-)",
    ingilizce: "Cost of Merchandise Sold",
    grup: "6",
    altGrup: "62 - SATIŞLARIN MALİYETİ",
    aciklama: "Satılan ticari malların maliyeti",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: false,
      gelirTablosuHesabi: true,
    },
    ornekKullanimlar: [
      "Ticari mal satış maliyeti",
      "Stok çıkışı",
    ],
    iliskiliHesaplar: ["153"],
  },
  {
    kod: "622",
    isim: "SATILAN HİZMET MALİYETİ (-)",
    ingilizce: "Cost of Services Sold",
    grup: "6",
    altGrup: "62 - SATIŞLARIN MALİYETİ",
    aciklama: "Satılan hizmetlerin maliyeti",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: false,
      gelirTablosuHesabi: true,
    },
    ornekKullanimlar: [
      "Hizmet maliyeti aktarımı",
      "Proje maliyeti",
    ],
    iliskiliHesaplar: ["741"],
  },

  // 64 - DİĞER FAALİYETLERDEN GELİRLER
  {
    kod: "642",
    isim: "FAİZ GELİRLERİ",
    ingilizce: "Interest Income",
    grup: "6",
    altGrup: "64 - DİĞER FAALİYETLERDEN GELİRLER",
    aciklama: "Banka mevduatı ve diğer kaynaklardan faiz gelirleri",
    ozellikler: {
      borcCalisan: false,
      alacakCalisan: true,
      bilancoHesabi: false,
      gelirTablosuHesabi: true,
    },
    ornekKullanimlar: [
      "Mevduat faizi",
      "Repo faizi",
    ],
    iliskiliHesaplar: ["102"],
  },
  {
    kod: "644",
    isim: "KONUSİON GELİRLERİ",
    ingilizce: "Commission Income",
    grup: "6",
    altGrup: "64 - DİĞER FAALİYETLERDEN GELİRLER",
    aciklama: "Aracılık faaliyetlerinden elde edilen komisyonlar",
    ozellikler: {
      borcCalisan: false,
      alacakCalisan: true,
      bilancoHesabi: false,
      gelirTablosuHesabi: true,
    },
    ornekKullanimlar: [
      "Satış komisyonu",
      "Aracılık komisyonu",
    ],
    iliskiliHesaplar: ["120", "100"],
  },
  {
    kod: "649",
    isim: "DİĞER OLAĞAN GELİR VE KARLAR",
    ingilizce: "Other Ordinary Income",
    grup: "6",
    altGrup: "64 - DİĞER FAALİYETLERDEN GELİRLER",
    aciklama: "Diğer olağan faaliyetlerden gelirler",
    ozellikler: {
      borcCalisan: false,
      alacakCalisan: true,
      bilancoHesabi: false,
      gelirTablosuHesabi: true,
    },
    ornekKullanimlar: [
      "Sigorta tazminatı",
      "Hurda satışı",
    ],
    iliskiliHesaplar: ["100", "102", "120"],
  },

  // 65 - DİĞER FAALİYETLERDEN GİDERLER
  {
    kod: "654",
    isim: "KARŞILIK GİDERLERİ (-)",
    ingilizce: "Provision Expenses",
    grup: "6",
    altGrup: "65 - DİĞER FAALİYETLERDEN GİDERLER",
    aciklama: "Alacak ve stoklar için ayrılan karşılık giderleri",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: false,
      gelirTablosuHesabi: true,
    },
    ornekKullanimlar: [
      "Şüpheli alacak karşılığı",
      "Stok değer düşüklüğü karşılığı",
    ],
    iliskiliHesaplar: ["122", "158"],
  },
  {
    kod: "659",
    isim: "DİĞER OLAĞAN GİDER VE ZARARLAR (-)",
    ingilizce: "Other Ordinary Expenses",
    grup: "6",
    altGrup: "65 - DİĞER FAALİYETLERDEN GİDERLER",
    aciklama: "Diğer olağan faaliyetlerden giderler",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: false,
      gelirTablosuHesabi: true,
    },
    ornekKullanimlar: [
      "Kur farkı gideri",
      "Sabit kıymet satış zararı",
    ],
    iliskiliHesaplar: ["100", "102"],
  },

  // 66 - FİNANSMAN GİDERLERİ
  {
    kod: "660",
    isim: "KISA VADELİ BORÇLANMA GİDERLERİ (-)",
    ingilizce: "Short-Term Borrowing Costs",
    grup: "6",
    altGrup: "66 - FİNANSMAN GİDERLERİ",
    aciklama: "Kısa vadeli borçlanmalardan kaynaklanan faiz giderleri",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: false,
      gelirTablosuHesabi: true,
    },
    ornekKullanimlar: [
      "Banka kredisi faizi",
      "Çek/senet faizi",
    ],
    iliskiliHesaplar: ["300", "102"],
  },
  {
    kod: "661",
    isim: "UZUN VADELİ BORÇLANMA GİDERLERİ (-)",
    ingilizce: "Long-Term Borrowing Costs",
    grup: "6",
    altGrup: "66 - FİNANSMAN GİDERLERİ",
    aciklama: "Uzun vadeli borçlanmalardan kaynaklanan faiz giderleri",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: false,
      gelirTablosuHesabi: true,
    },
    ornekKullanimlar: [
      "Yatırım kredisi faizi",
      "Leasing faizi",
    ],
    iliskiliHesaplar: ["400", "102"],
  },

  // 69 - DÖNEM KARI/ZARARI
  {
    kod: "690",
    isim: "DÖNEM KARI VEYA ZARARI",
    ingilizce: "Profit or Loss for the Period",
    grup: "6",
    altGrup: "69 - DÖNEM NET KARI/ZARARI",
    aciklama: "Dönem sonunda belirlenen kar veya zarar",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: true,
      bilancoHesabi: false,
      gelirTablosuHesabi: true,
    },
    ornekKullanimlar: [
      "Dönem sonu kar/zarar tespiti",
      "Gelir tablosu kapanış",
    ],
    iliskiliHesaplar: ["590", "591", "691", "692"],
  },
  {
    kod: "691",
    isim: "DÖNEM KARI VERGİ VE DİĞER YASAL YÜKÜMLÜLÜK KARŞILIKLARI (-)",
    ingilizce: "Corporate Tax and Other Legal Liabilities",
    grup: "6",
    altGrup: "69 - DÖNEM NET KARI/ZARARI",
    aciklama: "Dönem karı üzerinden hesaplanan kurumlar vergisi",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: false,
      gelirTablosuHesabi: true,
    },
    ornekKullanimlar: [
      "Kurumlar vergisi karşılığı",
      "Geçici vergi tahakkuku",
    ],
    iliskiliHesaplar: ["370", "193", "690"],
  },

  // 77 - GENEL YÖNETİM GİDERLERİ
  {
    kod: "770",
    isim: "GENEL YÖNETİM GİDERLERİ (-)",
    ingilizce: "General Administrative Expenses",
    grup: "7",
    altGrup: "77 - GENEL YÖNETİM GİDERLERİ",
    aciklama: "İşletmenin yönetim faaliyetleri ile ilgili giderler",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: false,
      gelirTablosuHesabi: true,
    },
    ornekKullanimlar: [
      "Personel giderleri",
      "Kira gideri",
      "Elektrik, su, doğalgaz",
      "Telefon, internet",
      "Amortisman gideri",
    ],
    iliskiliHesaplar: ["100", "102", "320", "335", "257"],
  },
  {
    kod: "760",
    isim: "PAZARLAMA SATIŞ VE DAĞITIM GİDERLERİ (-)",
    ingilizce: "Marketing and Distribution Expenses",
    grup: "7",
    altGrup: "76 - PAZARLAMA SATIŞ DAĞITIM GİDERLERİ",
    aciklama: "Satış ve pazarlama faaliyetleri ile ilgili giderler",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: false,
      gelirTablosuHesabi: true,
    },
    ornekKullanimlar: [
      "Reklam giderleri",
      "Nakliye giderleri",
      "Satış primi",
      "Komisyon gideri",
    ],
    iliskiliHesaplar: ["100", "102", "320"],
  },
  {
    kod: "780",
    isim: "FİNANSMAN GİDERLERİ (-)",
    ingilizce: "Finance Costs",
    grup: "7",
    altGrup: "78 - FİNANSMAN GİDERLERİ",
    aciklama: "Finansman faaliyetlerine ilişkin giderler",
    ozellikler: {
      borcCalisan: true,
      alacakCalisan: false,
      bilancoHesabi: false,
      gelirTablosuHesabi: true,
    },
    ornekKullanimlar: [
      "Banka faiz gideri",
      "Komisyon gideri",
      "Kredi masrafları",
    ],
    iliskiliHesaplar: ["300", "400", "102"],
  },
];

// =============================================================================
// TURKISH TAX RATES AND REGULATIONS
// =============================================================================

export const KDV_ORANLARI = {
  GENEL: 20, // Genel oran (2024'te %18'den %20'ye yükseldi)
  INDIRIMLI_1: 10, // İndirimli oran 1
  INDIRIMLI_2: 1, // İndirimli oran 2 (temel gıda)
  OZEL: 0, // İstisna
};

export const STOPAJ_ORANLARI = {
  UCRET: 0.15, // Ücret stopajı (kümülatif vergi dilimleri)
  SERBEST_MESLEK: 0.20, // Serbest meslek stopajı
  KIRA_GERCEK: 0.20, // Gayrimenkul kira stopajı (gerçek kişi)
  KIRA_TUZEL: 0, // Tüzel kişilere kira stopajı yok
  FAIZ: 0.15, // Mevduat faizi stopajı
  KAR_PAYI: 0.10, // Kar payı stopajı
};

export const KURUMLAR_VERGISI_ORANI = 0.25; // 2024 yılı için %25

export const GECICI_VERGI_ORANI = 0.25; // Kurumlar vergisi oranı ile aynı

export const SGK_ORANLARI = {
  ISCI_PAYI: {
    SIGORTA: 0.14, // %14
    ISSIZLIK: 0.01, // %1
  },
  ISVEREN_PAYI: {
    SIGORTA: 0.205, // %20.5 (kısa vadeli + uzun vadeli)
    ISSIZLIK: 0.02, // %2
  },
};

export const ASGARI_UCRET_2024 = {
  BRUT: 20002.50,
  NET: 17002.12,
  ISVEREN_MALIYETI: 23502.94,
};

// =============================================================================
// TURKISH ACCOUNTING TERMINOLOGY
// =============================================================================

export const MUHASEBE_TERIMLERI: Record<string, { turkce: string; ingilizce: string; aciklama: string }> = {
  bilanco: {
    turkce: "Bilanço",
    ingilizce: "Balance Sheet",
    aciklama: "İşletmenin belirli bir tarihteki varlık, borç ve sermaye durumunu gösteren tablo",
  },
  gelir_tablosu: {
    turkce: "Gelir Tablosu",
    ingilizce: "Income Statement",
    aciklama: "İşletmenin belirli bir dönemdeki gelir ve giderlerini gösteren tablo",
  },
  nakit_akis: {
    turkce: "Nakit Akış Tablosu",
    ingilizce: "Cash Flow Statement",
    aciklama: "İşletmenin nakit giriş ve çıkışlarını gösteren tablo",
  },
  amortisman: {
    turkce: "Amortisman",
    ingilizce: "Depreciation",
    aciklama: "Duran varlıkların değerinin kullanım süresine göre gider yazılması",
  },
  reeskont: {
    turkce: "Reeskont",
    ingilizce: "Rediscount",
    aciklama: "Vadeli alacak ve borçların bugünkü değerine indirgenmesi",
  },
  karsilik: {
    turkce: "Karşılık",
    ingilizce: "Provision",
    aciklama: "Gelecekte oluşması beklenen zararlar için ayrılan tutar",
  },
  tahakkuk: {
    turkce: "Tahakkuk",
    ingilizce: "Accrual",
    aciklama: "Gelir veya giderin gerçekleştiği dönemde muhasebeleştirilmesi",
  },
  mahsup: {
    turkce: "Mahsup",
    ingilizce: "Offset/Set-off",
    aciklama: "Karşılıklı alacak ve borçların birbirinden düşürülmesi",
  },
  mutabakat: {
    turkce: "Mutabakat",
    ingilizce: "Reconciliation",
    aciklama: "İki tarafın kayıtlarının karşılaştırılması ve uyumlaştırılması",
  },
  yevmiye: {
    turkce: "Yevmiye",
    ingilizce: "Journal Entry",
    aciklama: "Günlük muhasebe kayıtlarının tutulduğu defter",
  },
  defteri_kebir: {
    turkce: "Defteri Kebir",
    ingilizce: "General Ledger",
    aciklama: "Hesapların ayrıntılı takip edildiği ana defter",
  },
  mizan: {
    turkce: "Mizan",
    ingilizce: "Trial Balance",
    aciklama: "Hesapların borç ve alacak toplamlarını gösteren tablo",
  },
  kapanış: {
    turkce: "Dönem Sonu Kapanış",
    ingilizce: "Year-End Closing",
    aciklama: "Hesap döneminin kapatılması ve yeni döneme devir işlemleri",
  },
};

// =============================================================================
// COMMON ACCOUNTING SCENARIOS
// =============================================================================

export interface MuhasebeSenaryo {
  id: string;
  baslik: string;
  aciklama: string;
  kategori: string;
  ornekKayit: {
    borc: Array<{ hesap: string; tutar: string }>;
    alacak: Array<{ hesap: string; tutar: string }>;
    aciklama: string;
  };
  dikkatEdilecekler: string[];
  ilgiliMevzuat?: string[];
}

export const MUHASEBE_SENARYOLARI: MuhasebeSenaryo[] = [
  {
    id: "satis_fatura",
    baslik: "Mal/Hizmet Satışı (KDV'li)",
    aciklama: "Kredili veya peşin mal/hizmet satışı kaydı",
    kategori: "Satış İşlemleri",
    ornekKayit: {
      borc: [{ hesap: "120 ALICILAR", tutar: "11,800.00" }],
      alacak: [
        { hesap: "600 YURTİÇİ SATIŞLAR", tutar: "10,000.00" },
        { hesap: "391 HESAPLANAN KDV", tutar: "1,800.00" },
      ],
      aciklama: "Kredili satış faturası - Fatura No: A-001",
    },
    dikkatEdilecekler: [
      "Fatura tarihinde kayıt yapılmalı",
      "KDV oranı doğru uygulanmalı (%20, %10, %1)",
      "Ba-Bs formlarında bildirimi unutmayın (5.000 TL üzeri)",
    ],
    ilgiliMevzuat: ["VUK 229", "KDV Kanunu 1"],
  },
  {
    id: "alis_fatura",
    baslik: "Mal/Hizmet Alışı (KDV'li)",
    aciklama: "Kredili veya peşin mal/hizmet alışı kaydı",
    kategori: "Alış İşlemleri",
    ornekKayit: {
      borc: [
        { hesap: "153 TİCARİ MALLAR", tutar: "10,000.00" },
        { hesap: "191 İNDİRİLECEK KDV", tutar: "1,800.00" },
      ],
      alacak: [{ hesap: "320 SATICILAR", tutar: "11,800.00" }],
      aciklama: "Kredili mal alışı faturası - Tedarikçi: ABC Ltd.",
    },
    dikkatEdilecekler: [
      "Fatura aslının alınması zorunlu",
      "KDV indirimi için fatura gerekli",
      "Ba-Bs formlarında bildirimi unutmayın",
    ],
    ilgiliMevzuat: ["VUK 229", "KDV Kanunu 29"],
  },
  {
    id: "maas_tahakkuku",
    baslik: "Maaş Tahakkuku",
    aciklama: "Aylık personel maaş tahakkuk kaydı",
    kategori: "Personel İşlemleri",
    ornekKayit: {
      borc: [{ hesap: "770 GENEL YÖNETİM GİDERLERİ", tutar: "25,000.00" }],
      alacak: [
        { hesap: "335 PERSONELE BORÇLAR", tutar: "20,000.00" },
        { hesap: "360 ÖDENECEK VERGİ VE FONLAR", tutar: "2,000.00" },
        { hesap: "361 ÖDENECEK SGK KESİNTİLERİ", tutar: "3,000.00" },
      ],
      aciklama: "Ocak 2024 maaş tahakkuku",
    },
    dikkatEdilecekler: [
      "Brüt ücret üzerinden kesintiler yapılmalı",
      "Muhtasar beyanname zamanında verilmeli",
      "SGK bildirgeleri süresinde yapılmalı",
    ],
    ilgiliMevzuat: ["GVK 61", "5510 sayılı SGK Kanunu"],
  },
  {
    id: "amortisman_kaydi",
    baslik: "Amortisman Kaydı",
    aciklama: "Duran varlıklar için amortisman ayırma",
    kategori: "Dönem Sonu İşlemleri",
    ornekKayit: {
      borc: [{ hesap: "770 GENEL YÖNETİM GİDERLERİ", tutar: "5,000.00" }],
      alacak: [{ hesap: "257 BİRİKMİŞ AMORTİSMANLAR", tutar: "5,000.00" }],
      aciklama: "2024 yılı amortisman kaydı - Demirbaşlar",
    },
    dikkatEdilecekler: [
      "Amortisman oranları VUK'a uygun olmalı",
      "Normal veya hızlandırılmış amortisman seçimi",
      "Kıst amortisman uygulaması",
    ],
    ilgiliMevzuat: ["VUK 313-321", "Amortisman Genel Tebliği"],
  },
  {
    id: "kdv_mahsup",
    baslik: "KDV Mahsup Kaydı",
    aciklama: "Ay sonunda KDV mahsup ve beyanname kaydı",
    kategori: "Vergi İşlemleri",
    ornekKayit: {
      borc: [{ hesap: "391 HESAPLANAN KDV", tutar: "18,000.00" }],
      alacak: [
        { hesap: "191 İNDİRİLECEK KDV", tutar: "15,000.00" },
        { hesap: "360 ÖDENECEK VERGİ VE FONLAR", tutar: "3,000.00" },
      ],
      aciklama: "Ocak 2024 KDV beyannamesi mahsubu",
    },
    dikkatEdilecekler: [
      "Beyanname son tarihi: Ayın 26'sı",
      "Ödeme son tarihi: Ayın 26'sı",
      "Devreden KDV varsa 190 hesaba aktarılır",
    ],
    ilgiliMevzuat: ["KDV Kanunu 29-36"],
  },
  {
    id: "banka_kredisi",
    baslik: "Banka Kredisi Kullanımı",
    aciklama: "İşletme veya yatırım kredisi kullanımı",
    kategori: "Finansman İşlemleri",
    ornekKayit: {
      borc: [{ hesap: "102 BANKALAR", tutar: "100,000.00" }],
      alacak: [{ hesap: "300 BANKA KREDİLERİ", tutar: "100,000.00" }],
      aciklama: "ABC Bankası işletme kredisi kullanımı",
    },
    dikkatEdilecekler: [
      "Vade yapısına göre kısa/uzun vadeli ayrımı",
      "Faiz giderleri ayrıca takip edilmeli",
      "Kredi dosya masrafları gider yazılabilir",
    ],
    ilgiliMevzuat: ["VUK 285", "GVK 40"],
  },
  {
    id: "supeli_alacak",
    baslik: "Şüpheli Alacak Karşılığı",
    aciklama: "Tahsili şüpheli hale gelen alacaklar için karşılık ayırma",
    kategori: "Dönem Sonu İşlemleri",
    ornekKayit: {
      borc: [
        { hesap: "654 KARŞILIK GİDERLERİ", tutar: "5,000.00" },
        { hesap: "129 ŞÜPHELİ TİCARİ ALACAKLAR", tutar: "5,000.00" },
      ],
      alacak: [
        { hesap: "122 ŞÜPHELİ TİCARİ ALACAKLAR KARŞILIĞI", tutar: "5,000.00" },
        { hesap: "120 ALICILAR", tutar: "5,000.00" },
      ],
      aciklama: "XYZ A.Ş. alacağı için şüpheli alacak karşılığı",
    },
    dikkatEdilecekler: [
      "Dava veya icra takibi şartı aranır",
      "VUK 323'e uygun değerleme yapılmalı",
      "Karşılık ayrılmadan önce hukuki süreç başlatılmalı",
    ],
    ilgiliMevzuat: ["VUK 323", "VUK 322"],
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Find account code by partial match
 */
export function hesapKoduBul(
  aramaMetni: string,
  options: {
    sadeceBilancoHesabi?: boolean;
    sadeceGelirTablosu?: boolean;
    grup?: string;
  } = {}
): HesapKodu[] {
  const aramaLower = aramaMetni.toLowerCase();

  return TEK_DUZEN_HESAP_PLANI.filter((hesap) => {
    // Text match
    const eslesme =
      hesap.kod.includes(aramaMetni) ||
      hesap.isim.toLowerCase().includes(aramaLower) ||
      hesap.ingilizce.toLowerCase().includes(aramaLower) ||
      hesap.aciklama.toLowerCase().includes(aramaLower);

    if (!eslesme) return false;

    // Apply filters
    if (options.sadeceBilancoHesabi && !hesap.ozellikler.bilancoHesabi) return false;
    if (options.sadeceGelirTablosu && !hesap.ozellikler.gelirTablosuHesabi) return false;
    if (options.grup && hesap.grup !== options.grup) return false;

    return true;
  });
}

/**
 * Get account suggestions based on transaction description
 */
export function islemIcinHesapOner(islemAciklamasi: string): Array<{
  hesap: HesapKodu;
  oneriNedeni: string;
  tahminiSkor: number;
}> {
  const aciklamaLower = islemAciklamasi.toLowerCase();
  const oneriler: Array<{
    hesap: HesapKodu;
    oneriNedeni: string;
    tahminiSkor: number;
  }> = [];

  // Keyword-based suggestions
  const anahtar_kelimeler: Record<string, { hesapKodlari: string[]; neden: string }> = {
    kira: { hesapKodlari: ["770", "326", "180"], neden: "Kira işlemi tespit edildi" },
    maaş: { hesapKodlari: ["335", "770", "360", "361"], neden: "Maaş/ücret işlemi tespit edildi" },
    fatura: { hesapKodlari: ["120", "320", "600", "153", "191", "391"], neden: "Fatura işlemi tespit edildi" },
    satış: { hesapKodlari: ["600", "120", "391", "100", "102"], neden: "Satış işlemi tespit edildi" },
    alış: { hesapKodlari: ["153", "320", "191"], neden: "Alış işlemi tespit edildi" },
    nakit: { hesapKodlari: ["100"], neden: "Nakit işlemi tespit edildi" },
    banka: { hesapKodlari: ["102", "300"], neden: "Banka işlemi tespit edildi" },
    kredi: { hesapKodlari: ["300", "400", "780", "660"], neden: "Kredi işlemi tespit edildi" },
    amortisman: { hesapKodlari: ["257", "770", "730"], neden: "Amortisman işlemi tespit edildi" },
    kdv: { hesapKodlari: ["191", "391", "190", "360"], neden: "KDV işlemi tespit edildi" },
    vergi: { hesapKodlari: ["360", "193", "370", "691"], neden: "Vergi işlemi tespit edildi" },
    sgk: { hesapKodlari: ["361", "770"], neden: "SGK işlemi tespit edildi" },
    demirbaş: { hesapKodlari: ["255", "257"], neden: "Demirbaş işlemi tespit edildi" },
    araç: { hesapKodlari: ["254", "257"], neden: "Taşıt işlemi tespit edildi" },
    personel: { hesapKodlari: ["335", "770", "360", "361"], neden: "Personel işlemi tespit edildi" },
    stok: { hesapKodlari: ["153", "150", "152"], neden: "Stok işlemi tespit edildi" },
    komisyon: { hesapKodlari: ["644", "760"], neden: "Komisyon işlemi tespit edildi" },
    faiz: { hesapKodlari: ["642", "660", "661", "780"], neden: "Faiz işlemi tespit edildi" },
    çek: { hesapKodlari: ["101", "103"], neden: "Çek işlemi tespit edildi" },
    senet: { hesapKodlari: ["121", "321"], neden: "Senet işlemi tespit edildi" },
    depozito: { hesapKodlari: ["126", "326"], neden: "Depozito işlemi tespit edildi" },
    iade: { hesapKodlari: ["610", "153"], neden: "İade işlemi tespit edildi" },
    iskonto: { hesapKodlari: ["611"], neden: "İskonto işlemi tespit edildi" },
    ihracat: { hesapKodlari: ["601"], neden: "İhracat işlemi tespit edildi" },
    kar: { hesapKodlari: ["590", "570", "690"], neden: "Kar işlemi tespit edildi" },
    zarar: { hesapKodlari: ["591", "580", "690"], neden: "Zarar işlemi tespit edildi" },
  };

  // Check for keyword matches
  for (const [anahtar, bilgi] of Object.entries(anahtar_kelimeler)) {
    if (aciklamaLower.includes(anahtar)) {
      for (const kod of bilgi.hesapKodlari) {
        const hesap = TEK_DUZEN_HESAP_PLANI.find((h) => h.kod === kod);
        if (hesap) {
          // Calculate score based on position and specificity
          const pozisyon = aciklamaLower.indexOf(anahtar);
          const tahminiSkor = 100 - pozisyon / 10;

          oneriler.push({
            hesap,
            oneriNedeni: bilgi.neden,
            tahminiSkor: Math.min(100, Math.max(0, tahminiSkor)),
          });
        }
      }
    }
  }

  // Sort by score and remove duplicates
  const benzersizOneriler = oneriler.reduce(
    (acc, curr) => {
      const mevcut = acc.find((o) => o.hesap.kod === curr.hesap.kod);
      if (!mevcut || mevcut.tahminiSkor < curr.tahminiSkor) {
        return [...acc.filter((o) => o.hesap.kod !== curr.hesap.kod), curr];
      }
      return acc;
    },
    [] as typeof oneriler
  );

  return benzersizOneriler.sort((a, b) => b.tahminiSkor - a.tahminiSkor).slice(0, 10);
}

/**
 * Get related accounts for a given account code
 */
export function iliskiliHesaplariGetir(hesapKodu: string): HesapKodu[] {
  const hesap = TEK_DUZEN_HESAP_PLANI.find((h) => h.kod === hesapKodu);
  if (!hesap) return [];

  return hesap.iliskiliHesaplar
    .map((kod) => TEK_DUZEN_HESAP_PLANI.find((h) => h.kod === kod))
    .filter((h): h is HesapKodu => h !== undefined);
}

/**
 * Get accounting scenario by category
 */
export function senaryolariGetir(kategori?: string): MuhasebeSenaryo[] {
  if (!kategori) return MUHASEBE_SENARYOLARI;
  return MUHASEBE_SENARYOLARI.filter((s) => s.kategori === kategori);
}
