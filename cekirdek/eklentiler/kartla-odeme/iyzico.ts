// iyzico bağlantısı (kart 0215, karar 0142). Ödeme kuruluşuna özgü her şey bu dosyadadır: kimlik doğrulama (IYZWSv2),
// ödeme formu (Checkout Form), sonuç sorgusu, aynı gün iptal, taksit sorgusu, günlük işlem raporu ve imzalı bildirimin
// doğrulaması. Eklentinin servisi kuruluşu yalnız buradan tanır; başka bir kuruluş aynı işlevlerle yeni bir dosya olur.
//
// Kaynak: https://docs.iyzico.com (kimlik doğrulama hmacsha256-auth, ödeme formu cf-initialize ve cf-retrieve,
// refund-and-cancel, installment-and-bin-service, webhook, response-signature-validation, reporting-service).
//
// Kurallar:
// - Her çağrının zaman aşımı vardır (kartlaOdemeAyari.zamanAsimiMs). Ulaşılamayan ya da beklenmeyen yanıt
//   KurulusHatasi atar; servis işlemi yarım bırakmaz.
// - Tutarlar kuruştur; kuruluşa noktalı ondalıkla gider, kuruluştan gelen tutar kuruşa çevrilir.
// - Sonuç sorgusunun ve bildirimin imzası gizli anahtarla doğrulanır; imzası tutmayan yanıt kabul edilmez.
// - Deneme ortamında kuruluşun adresi yerel bir sahte kuruluşa çevrilebilir (KARTLA_ODEME_DENEME_ADRESI, yalnız
//   localhost ya da 127.0.0.1, yalnız deneme ortamında): testler ve tarayıcı testleri gerçek kuruluşa gitmez.
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { type DisServisYaniti, disServiseIstek } from "../../dis-servis/istek.ts";
import { type KartlaOdemeOrtami, kartlaOdemeAyari } from "../../kayitlar/eklentiler.ts";

export class KurulusHatasi extends Error {}

export type KurulusAnahtarlari = { anahtar: string; gizli: string };

const ortamAdresleri: Record<KartlaOdemeOrtami, string> = {
  deneme: "https://sandbox-api.iyzipay.com",
  canli: "https://api.iyzipay.com",
};

// Deneme ortamında yerel sahte kuruluşun adresi (testler). Canlı ortamda ya da yerel olmayan adreste yok sayılır.
const denemeAdresi = (): string | undefined => {
  const adres = process.env["KARTLA_ODEME_DENEME_ADRESI"];
  if (adres === undefined || adres === "" || !URL.canParse(adres)) return undefined;
  const { protocol, hostname } = new URL(adres);
  if (protocol !== "http:" || !["localhost", "127.0.0.1"].includes(hostname)) return undefined;
  return adres.replace(/\/+$/, "");
};

export const kurulusAdresi = (ortam: KartlaOdemeOrtami): string =>
  (ortam === "deneme" ? denemeAdresi() : undefined) ?? ortamAdresleri[ortam];

const hmac = (gizli: string, veri: string): string =>
  createHmac("sha256", gizli).update(veri, "utf8").digest("hex");

// Sabit sürede karşılaştırma: imza tahmini zamanlamayla yapılamasın.
export const imzaAyniMi = (beklenen: string, gelen: string): boolean => {
  const a = Buffer.from(beklenen, "utf8");
  const b = Buffer.from(gelen.toLowerCase(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
};

// IYZWSv2: HMACSHA256(randomKey + uri.path + gövde, gizli anahtar), onaltılık; başlık base64("apiKey:…&randomKey:…
// &signature:…"). Yol sorgu kısmı olmadan imzalanır: gerçek deneme ortamı GET isteğinde sorguyla imzayı reddetti
// ("Authentication token is not verified"), sorgusuzu kabul etti (2026-11-17, ölçüldü).
export const yetkiBasligi = (
  anahtarlar: KurulusAnahtarlari,
  yol: string,
  govde: string,
  rastgele: string,
): string => {
  const imza = hmac(anahtarlar.gizli, rastgele + yol + govde);
  const deger = `apiKey:${anahtarlar.anahtar}&randomKey:${rastgele}&signature:${imza}`;
  return `IYZWSv2 ${Buffer.from(deger, "utf8").toString("base64")}`;
};

// Kuruş → kuruluşun tutar yazılışı ("150.5"); kuruluşun tutarı → kuruş.
export const tutarYaz = (kurus: number): string => (kurus / 100).toFixed(2);
export const tutarOku = (deger: unknown): number | undefined => {
  const sayi = typeof deger === "number" ? deger : Number(deger);
  if (!Number.isFinite(sayi) || sayi < 0) return undefined;
  return Math.round(sayi * 100);
};
// İmzada tutarın sondaki sıfırları atılır ("50.00" → "50", "10.50" → "10.5").
const imzaTutari = (deger: unknown): string => String(Number(deger));

type Yanit = Record<string, unknown>;

const cagir = async (
  ortam: KartlaOdemeOrtami,
  anahtarlar: KurulusAnahtarlari,
  yontem: "GET" | "POST",
  yol: string,
  girdi?: Record<string, unknown>,
): Promise<Yanit> => {
  const govde = girdi === undefined ? "" : JSON.stringify(girdi);
  const rastgele = `${Date.now()}${randomInt(100_000_000, 999_999_999)}`;
  let yanit: DisServisYaniti;
  try {
    yanit = await disServiseIstek(
      `${kurulusAdresi(ortam)}${yol}`,
      {
        yontem,
        basliklar: {
          Authorization: yetkiBasligi(anahtarlar, yol.split("?")[0] ?? yol, govde, rastgele),
          "x-iyzi-rnd": rastgele,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        ...(yontem === "POST" ? { govde } : {}),
      },
      kartlaOdemeAyari.zamanAsimiMs,
    );
  } catch (hata) {
    throw new KurulusHatasi(`Ödeme kuruluşuna ulaşılamadı: ${yol}`, { cause: hata });
  }
  let veri: unknown;
  try {
    veri = JSON.parse(yanit.metin);
  } catch {
    throw new KurulusHatasi(`Ödeme kuruluşunun yanıtı okunamadı: ${yol} (${yanit.durum})`);
  }
  if (typeof veri !== "object" || veri === null) {
    throw new KurulusHatasi(`Ödeme kuruluşunun yanıtı beklenmeyen biçimde: ${yol}`);
  }
  return veri as Yanit;
};

const basariliMi = (yanit: Yanit): boolean => yanit["status"] === "success";
const hataAyrintisi = (yanit: Yanit): string =>
  `${String(yanit["errorCode"] ?? "")} ${String(yanit["errorMessage"] ?? "")}`.trim();

// --- Ödeme formu ---

export type FormGirdisi = {
  // Ödeme oturumunun kimliği: kuruluşta conversationId ve basketId olur.
  oturum: string;
  tutar: number;
  paraBirimi: string;
  donusAdresi: string;
  taksitler: number[];
  alici: {
    kimlik: string;
    ad: string;
    soyad: string;
    kimlikNumarasi: string;
    eposta: string;
    telefon: string;
    adres: string;
    il: string;
    ulke: string;
    postaKodu?: string | undefined;
    ip?: string | undefined;
  };
  teslimat: {
    kisi: string;
    il: string;
    ulke: string;
    adres: string;
    postaKodu?: string | undefined;
  };
  fatura: { kisi: string; il: string; ulke: string; adres: string; postaKodu?: string | undefined };
  // Toplamı tutara eşit kalemler (kuruş).
  kalemler: { kimlik: string; ad: string; kategori: string; tutar: number }[];
};

const adresi = (adres: FormGirdisi["teslimat"]) => ({
  contactName: adres.kisi,
  city: adres.il,
  country: adres.ulke,
  address: adres.adres,
  ...(adres.postaKodu === undefined ? {} : { zipCode: adres.postaKodu }),
});

export const odemeFormuBaslat = async (
  ortam: KartlaOdemeOrtami,
  anahtarlar: KurulusAnahtarlari,
  girdi: FormGirdisi,
): Promise<{ belirtec: string; adres: string }> => {
  const yanit = await cagir(
    ortam,
    anahtarlar,
    "POST",
    "/payment/iyzipos/checkoutform/initialize/auth/ecom",
    {
      locale: "tr",
      conversationId: girdi.oturum,
      price: tutarYaz(girdi.tutar),
      paidPrice: tutarYaz(girdi.tutar),
      currency: girdi.paraBirimi,
      basketId: girdi.oturum,
      paymentGroup: "PRODUCT",
      callbackUrl: girdi.donusAdresi,
      enabledInstallments: girdi.taksitler,
      buyer: {
        id: girdi.alici.kimlik,
        name: girdi.alici.ad,
        surname: girdi.alici.soyad,
        identityNumber: girdi.alici.kimlikNumarasi,
        email: girdi.alici.eposta,
        gsmNumber: girdi.alici.telefon,
        registrationAddress: girdi.alici.adres,
        city: girdi.alici.il,
        country: girdi.alici.ulke,
        ...(girdi.alici.postaKodu === undefined ? {} : { zipCode: girdi.alici.postaKodu }),
        ...(girdi.alici.ip === undefined ? {} : { ip: girdi.alici.ip }),
      },
      shippingAddress: adresi(girdi.teslimat),
      billingAddress: adresi(girdi.fatura),
      basketItems: girdi.kalemler.map((kalem) => ({
        id: kalem.kimlik,
        name: kalem.ad,
        category1: kalem.kategori,
        itemType: "PHYSICAL",
        price: tutarYaz(kalem.tutar),
      })),
    },
  );
  const { token, paymentPageUrl } = yanit;
  if (!basariliMi(yanit) || typeof token !== "string" || typeof paymentPageUrl !== "string") {
    throw new KurulusHatasi(`Ödeme formu başlatılamadı: ${hataAyrintisi(yanit)}`);
  }
  // İmza: conversationId ve token (response-signature-validation).
  const imza = hmac(anahtarlar.gizli, [yanit["conversationId"], token].map(String).join(":"));
  if (typeof yanit["signature"] !== "string" || !imzaAyniMi(imza, yanit["signature"])) {
    throw new KurulusHatasi("Ödeme formunun yanıt imzası tutmadı.");
  }
  // Müşteri yalnız şifreli adrese gönderilir; yerel sahte kuruluş (testler) şifresizdir.
  const sahte = ortam === "deneme" && denemeAdresi() !== undefined;
  if (
    yanit["conversationId"] !== girdi.oturum ||
    !(paymentPageUrl.startsWith("https://") || sahte)
  ) {
    throw new KurulusHatasi("Ödeme formunun yanıtı beklenmeyen adres ya da oturum taşıyor.");
  }
  return { belirtec: token, adres: paymentPageUrl };
};

// --- Sonuç sorgusu ---

export type OdemeSonucu =
  | {
      tur: "odendi";
      odemeKimligi: string;
      oturum: string;
      tutar: number;
      odenen: number;
      paraBirimi: string;
      taksit: number;
    }
  | { tur: "basarisiz"; oturum: string | undefined }
  // Ödeme sürüyor (3D Secure adımında) ya da kuruluş henüz sonuç vermedi. inceleme: ödeme alındı ama kuruluşun
  // sahtecilik incelemesinde; karar sonra gelir, süre dolunca başarısız sayılmaz.
  | { tur: "bekliyor"; inceleme?: true };

export const odemeSonucu = async (
  ortam: KartlaOdemeOrtami,
  anahtarlar: KurulusAnahtarlari,
  belirtec: string,
): Promise<OdemeSonucu> => {
  const yanit = await cagir(
    ortam,
    anahtarlar,
    "POST",
    "/payment/iyzipos/checkoutform/auth/ecom/detail",
    {
      locale: "tr",
      token: belirtec,
    },
  );
  if (!basariliMi(yanit)) {
    // Kuruluş sonucu vermedi. Müşteri henüz ödemediyse gerçek deneme ortamı "5122: Gönderilen tokena ait ödeme bilgisi
    // bulunamadı" der (2026-11-17, ölçüldü): ödeme yarıda ya da sürüyor olabilir. Ödeme yalnız kuruluş açıkça başarısız
    // derse başarısız sayılır; belirsiz sonuç bekler (uzun süre sonra tarama başarısız sayar).
    return { tur: "bekliyor" };
  }
  // İmza: paymentStatus, paymentId, currency, basketId, conversationId, paidPrice, price, token.
  const imza = hmac(
    anahtarlar.gizli,
    [
      yanit["paymentStatus"],
      yanit["paymentId"],
      yanit["currency"],
      yanit["basketId"],
      yanit["conversationId"],
      imzaTutari(yanit["paidPrice"]),
      imzaTutari(yanit["price"]),
      yanit["token"],
    ]
      .map((deger) => String(deger ?? ""))
      .join(":"),
  );
  if (typeof yanit["signature"] !== "string" || !imzaAyniMi(imza, yanit["signature"])) {
    throw new KurulusHatasi("Ödeme sonucunun imzası tutmadı.");
  }
  if (yanit["token"] !== belirtec)
    throw new KurulusHatasi("Ödeme sonucu başka bir belirteç taşıyor.");
  // Oturum sepet kimliğidir (basketId, başlatırken oturumun kimliği yazılır): yanıt conversationId'yi yalnız istekte
  // gönderilirse geri yazar (gerçek deneme ortamında ölçüldü, 2026-11-17).
  const oturum = typeof yanit["basketId"] === "string" ? yanit["basketId"] : undefined;
  if (yanit["paymentStatus"] === "FAILURE") return { tur: "basarisiz", oturum };
  if (yanit["paymentStatus"] !== "SUCCESS") return { tur: "bekliyor" };
  // Sahtecilik denetimi: yalnız 1 gönderilir (kuruluşun kuralı). -1 reddedildi, 0 incelemede (karar sonra gelir).
  const sahtecilik = Number(yanit["fraudStatus"]);
  if (sahtecilik === -1) return { tur: "basarisiz", oturum };
  if (sahtecilik !== 1) return { tur: "bekliyor", inceleme: true };
  const tutar = tutarOku(yanit["price"]);
  const odenen = tutarOku(yanit["paidPrice"]);
  const taksit = Number(yanit["installment"] ?? 1);
  if (
    typeof yanit["paymentId"] !== "string" ||
    oturum === undefined ||
    tutar === undefined ||
    odenen === undefined ||
    typeof yanit["currency"] !== "string" ||
    !Number.isInteger(taksit) ||
    taksit < 1
  ) {
    throw new KurulusHatasi("Ödeme sonucu eksik alan taşıyor.");
  }
  return {
    tur: "odendi",
    odemeKimligi: yanit["paymentId"],
    oturum,
    tutar,
    odenen,
    paraBirimi: yanit["currency"],
    taksit,
  };
};

// --- Aynı gün iptal ---

export const odemeyiIptalEt = async (
  ortam: KartlaOdemeOrtami,
  anahtarlar: KurulusAnahtarlari,
  odemeKimligi: string,
  oturum: string,
): Promise<void> => {
  const yanit = await cagir(ortam, anahtarlar, "POST", "/payment/cancel", {
    locale: "tr",
    conversationId: oturum,
    paymentId: odemeKimligi,
  });
  if (!basariliMi(yanit) || String(yanit["paymentId"]) !== odemeKimligi) {
    throw new KurulusHatasi(`Ödeme iptal edilemedi: ${hataAyrintisi(yanit)}`);
  }
};

// --- Taksit sorgusu (kart numarasız: bankalara göre genel tablo) ---

export type BankaTaksitleri = {
  banka: string;
  aile: string;
  taksitler: { sayi: number; aylik: number; toplam: number }[];
};

export const taksitSecenekleri = async (
  ortam: KartlaOdemeOrtami,
  anahtarlar: KurulusAnahtarlari,
  tutar: number,
): Promise<BankaTaksitleri[]> => {
  const yanit = await cagir(ortam, anahtarlar, "POST", "/payment/iyzipos/installment", {
    locale: "tr",
    price: tutarYaz(tutar),
  });
  if (!basariliMi(yanit) || !Array.isArray(yanit["installmentDetails"])) {
    throw new KurulusHatasi(`Taksit seçenekleri alınamadı: ${hataAyrintisi(yanit)}`);
  }
  return (yanit["installmentDetails"] as Yanit[]).map((ayrinti) => ({
    banka: String(ayrinti["bankName"] ?? ""),
    aile: String(ayrinti["cardFamilyName"] ?? ""),
    taksitler: (Array.isArray(ayrinti["installmentPrices"])
      ? (ayrinti["installmentPrices"] as Yanit[])
      : []
    ).flatMap((fiyat) => {
      const sayi = Number(fiyat["installmentNumber"]);
      const aylik = tutarOku(fiyat["installmentPrice"]);
      const toplam = tutarOku(fiyat["totalPrice"]);
      return Number.isInteger(sayi) && aylik !== undefined && toplam !== undefined
        ? [{ sayi, aylik, toplam }]
        : [];
    }),
  }));
};

// --- Günlük işlem raporu ---

export type RaporIslemi = {
  tur: "odeme" | "iptal" | "iade";
  odemeKimligi: string;
  oturum: string | undefined;
  odenen: number | undefined;
  basarili: boolean;
};

// Bir günün (YYYY-AA-GG, kuruluşun takvimiyle) bütün işlemleri, sayfa sayfa.
export const gununIslemleri = async (
  ortam: KartlaOdemeOrtami,
  anahtarlar: KurulusAnahtarlari,
  gun: string,
): Promise<RaporIslemi[]> => {
  const islemler: RaporIslemi[] = [];
  for (let sayfa = 1; sayfa <= 1000; sayfa += 1) {
    const yanit = await cagir(
      ortam,
      anahtarlar,
      "GET",
      `/v2/reporting/payment/transactions?transactionDate=${gun}&page=${sayfa}`,
    );
    if (!basariliMi(yanit) || !Array.isArray(yanit["transactions"])) {
      throw new KurulusHatasi(`İşlem raporu alınamadı: ${hataAyrintisi(yanit)}`);
    }
    for (const islem of yanit["transactions"] as Yanit[]) {
      const tur =
        islem["transactionType"] === "PAYMENT"
          ? "odeme"
          : islem["transactionType"] === "CANCEL"
            ? "iptal"
            : islem["transactionType"] === "REFUND"
              ? "iade"
              : undefined;
      if (tur === undefined || islem["paymentId"] === undefined) continue;
      islemler.push({
        tur,
        odemeKimligi: String(islem["paymentId"]),
        oturum: typeof islem["conversationId"] === "string" ? islem["conversationId"] : undefined,
        odenen: tutarOku(islem["paidPrice"]),
        basarili: Number(islem["transactionStatus"]) === 1,
      });
    }
    if (sayfa >= Number(yanit["totalPageCount"] ?? 1)) break;
  }
  return islemler;
};

// --- İmzalı bildirim (webhook, ödeme formu biçimi) ---

export type Bildirim = { belirtec: string; oturum: string; durum: string };

// X-IYZ-SIGNATURE-V3: HMACSHA256(gizli anahtar, secretKey + iyziEventType + iyziPaymentId + token +
// paymentConversationId + status), onaltılık. İmza yoksa ya da tutmazsa undefined.
export const bildirimiDogrula = (
  anahtarlar: KurulusAnahtarlari,
  govde: Record<string, unknown>,
  imza: string | null,
): Bildirim | undefined => {
  const { iyziEventType, iyziPaymentId, token, paymentConversationId, status } = govde;
  if (imza === null || typeof token !== "string" || typeof paymentConversationId !== "string") {
    return undefined;
  }
  const beklenen = hmac(
    anahtarlar.gizli,
    [anahtarlar.gizli, iyziEventType, iyziPaymentId, token, paymentConversationId, status]
      .map((deger) => String(deger ?? ""))
      .join(""),
  );
  if (!imzaAyniMi(beklenen, imza)) return undefined;
  return { belirtec: token, oturum: paymentConversationId, durum: String(status ?? "") };
};

export const bildirimImzaBasligi = "x-iyz-signature-v3";
