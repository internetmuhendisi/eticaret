// Ödeme adımının ortak şemaları (kart 0213, karar 0140; .claude/rules/formlar.md). Form ve uç aynı kuralları kullanır.
// Sınırlar ve fatura türleri cekirdek/kayitlar/odeme.ts kaydındadır.
//
// - Teslimat: ad, soyad, telefon ve ortak posta adresi (il ve ilçe listeden, karar 0056, 0057). Telefon ülke içindeki
//   yazılışla da girilir, ülkenin koduyla uluslararası biçime çevrilir. Telefonun zorunluluğu mağaza ayarıdır: şema
//   yalnız biçimi denetler, zorunluluğu servis ayarla denetler (form da ayarı bilir).
// - Fatura: bireysel ya da kurumsal; "fatura adresi teslimat adresiyle aynı" işaretli değilse fatura adresi zorunlu.
//   Kurumsalda firma adı, vergi dairesi ve vergi numarası; numaranın biçimi faturanın ülkesinin veri dosyasından
//   (cekirdek/bolgeler/satici.ts), kodda ülkeye özgü biçim yazmaz.
// - Not ve adlar düz metindir (cekirdek/metinler/duz-metin.ts).
// - Ön bilgilendirme ve mesafeli satış onayı zorunludur (true dışında bir değer geçmez). Pazarlama izni işaretsiz
//   gelir, işaretlenmezse verilmez (kayıt formuyla aynı kural, kart 0033).
// - Tutar hiçbir şemada yoktur: tarayıcıdan yalnız sepetin kalemleri gelir, tutar sunucuda hesaplanır.
import { z } from "zod";
import { postaAdresiSemasi, telefonGecerliMi, telefonuDuzelt } from "../../bolgeler/adres.ts";
import { faturaVergiNumarasiHatasi } from "../../bolgeler/satici.ts";
import { faturaTurleri, odemeSinirlari } from "../../kayitlar/odeme.ts";
import { sepetSinirlari } from "../../kayitlar/sepet.ts";
import { duzMetinSemasi } from "../../metinler/duz-metin.ts";
import { kimlikSemasi } from "../../veritabani/kimlik.ts";
import { epostaSemasi, sifreSemasi } from "../oturum/semalar.ts";
import { robotCevabiSemasi } from "../robot-korumasi/semalar.ts";
import { sepetKalemiSemasi } from "../sepet/semalar.ts";

// Boş yazılan isteğe bağlı alan yoktur.
const bosIseYok = (deger: unknown) =>
  typeof deger === "string" && deger.trim() === "" ? undefined : deger;

const adSemasi = duzMetinSemasi(odemeSinirlari.adEnCok);

export const teslimatSemasi = z
  .strictObject({
    ad: adSemasi,
    soyad: adSemasi,
    telefon: z.preprocess(bosIseYok, z.string().max(40).optional()),
    adres: postaAdresiSemasi,
  })
  .transform((teslimat, ctx) => {
    if (teslimat.telefon === undefined) return { ...teslimat, telefon: undefined };
    const telefon = telefonuDuzelt(teslimat.adres.ulke, teslimat.telefon);
    if (!telefonGecerliMi(telefon)) {
      ctx.addIssue({ code: "custom", message: "telefon-bicimi", path: ["telefon"] });
      return z.NEVER;
    }
    return { ...teslimat, telefon };
  });
export type Teslimat = z.output<typeof teslimatSemasi>;

const adresAyniSemasi = z.boolean();

const bireyselFatura = z.strictObject({
  tur: z.literal(faturaTurleri[0]),
  adresAyni: adresAyniSemasi,
  adres: postaAdresiSemasi.optional(),
});

const kurumsalFatura = z.strictObject({
  tur: z.literal(faturaTurleri[1]),
  firma: adSemasi,
  vergiDairesi: duzMetinSemasi(odemeSinirlari.vergiDairesiEnCok),
  vergiNumarasi: z.string().trim().min(1).max(30),
  adresAyni: adresAyniSemasi,
  adres: postaAdresiSemasi.optional(),
});

// "Aynı" işaretliyken fatura adresi saklanmaz (teslimat adresi geçerlidir); değilse zorunludur.
export const faturaSemasi = z
  .discriminatedUnion("tur", [bireyselFatura, kurumsalFatura])
  .transform((fatura, ctx) => {
    if (fatura.adresAyni) return { ...fatura, adres: undefined };
    if (fatura.adres === undefined) {
      ctx.addIssue({ code: "custom", message: "fatura-adresi-gerekli", path: ["adres"] });
      return z.NEVER;
    }
    return fatura;
  });
export type Fatura = z.output<typeof faturaSemasi>;

export const odemeBilgileriSemasi = z
  .strictObject({
    teslimat: teslimatSemasi,
    fatura: faturaSemasi,
    not: z.preprocess(bosIseYok, duzMetinSemasi(odemeSinirlari.notEnCok).optional()),
    onBilgilendirmeOnayi: z.literal(true),
    mesafeliSatisOnayi: z.literal(true),
    pazarlamaIzni: z.boolean(),
  })
  .superRefine((bilgiler, ctx) => {
    const { fatura, teslimat } = bilgiler;
    if (fatura.tur !== "kurumsal") return;
    // Numaranın kuralı faturanın ülkesinden: ayrı fatura adresi yoksa teslimatın ülkesi.
    const ulke = (fatura.adres ?? teslimat.adres).ulke;
    const hata = faturaVergiNumarasiHatasi(ulke, fatura.vergiNumarasi);
    if (hata !== undefined) {
      ctx.addIssue({ code: "custom", message: hata, path: ["fatura", "vergiNumarasi"] });
    }
  });
export type OdemeBilgileri = z.output<typeof odemeBilgileriSemasi>;

// Üye olmayan müşteri e-postasını verir, isterse hesap açar (müşteri kaydının kuralıyla, karar 0051).
export const hesapAcmaSemasi = z.discriminatedUnion("ac", [
  z.strictObject({ ac: z.literal(false) }),
  z.strictObject({
    ac: z.literal(true),
    sifre: sifreSemasi,
    uyelikOnayi: z.literal(true),
    kvkkOnayi: z.literal(true),
  }),
]);

export const misafirOdemeFormuSemasi = z.strictObject({
  eposta: epostaSemasi,
  hesap: hesapAcmaSemasi,
  bilgiler: odemeBilgileriSemasi,
});
export type MisafirOdemeFormu = z.output<typeof misafirOdemeFormuSemasi>;

// Giriş yapmış müşterinin e-postası hesabındandır, girdiden alınmaz.
export const uyeOdemeFormuSemasi = z.strictObject({ bilgiler: odemeBilgileriSemasi });

// Uçların girdisi: formun üstüne sepetin kalemleri, robot cevabı ve müşterinin bir önceki onayının oturumu (aynı
// müşteri yeniden basınca kendi ayırması kendisine engel olmasın; o oturum serbest bırakılır).
const ucEkleri = {
  kalemler: z.array(sepetKalemiSemasi).min(1).max(sepetSinirlari.kalemEnCok),
  robotCevabi: robotCevabiSemasi,
  onceki: kimlikSemasi.optional(),
};

export const misafirOdemeGirdisi = misafirOdemeFormuSemasi.extend(ucEkleri);
export const uyeOdemeGirdisi = uyeOdemeFormuSemasi.extend(ucEkleri);
