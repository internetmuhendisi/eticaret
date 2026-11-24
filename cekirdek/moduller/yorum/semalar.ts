// Yorum uçlarının ve formunun ortak şemaları (kart 0139, karar 0109; .claude/rules/formlar.md). Form ve uç aynı
// kuralları kullanır. Sınırlar ve durumlar cekirdek/kayitlar/yorum.ts kaydındadır.
//
// Metinler düz metindir: kırpılır, NFC'ye çevrilir; satır sonu ve sekme dışındaki denetim karakterleri reddedilir.
// HTML ya da bağlantı ayıklanmaz, çünkü hiçbir yerde HTML olarak çizilmez (vitrin yazı olarak çizer).
import { z } from "zod";
import { panelSayfaBoylari } from "../../kayitlar/liste.ts";
import {
  type YorumTopluIslemi,
  yorumKararlari,
  yorumSinirlari,
  yorumTopluIslemKodlari,
} from "../../kayitlar/yorum.ts";
import { duzMetinSemasi } from "../../metinler/duz-metin.ts";
import { kimlikSemasi } from "../../veritabani/kimlik.ts";
import { robotCevabiSemasi } from "../robot-korumasi/semalar.ts";

// Hata kodları ve ekrandaki metinleri. Kod bir kez yayınlandıktan sonra adı değişmez.
export const yorumHatalari = [
  // Ürün yok ya da sayfası açılmıyor.
  "urun-yok",
  // "Yalnız satın alanlar yorum yapabilir" açık ve müşteri ürünü satın almamış.
  "satin-alma-gerekli",
  // Müşterinin bu ürüne yorumu var (kullanıcı kararı: bir ürüne bir yorum).
  "yorum-yazildi",
  "yorum-yok",
  "metin-gecersiz",
] as const;
export type YorumHatasi = (typeof yorumHatalari)[number];

// Düz metnin kuralı ortaktır (cekirdek/metinler/duz-metin.ts).
const duzMetin = duzMetinSemasi;

export const yorumFormuSemasi = z.strictObject({
  urun: kimlikSemasi,
  puan: z.int().min(yorumSinirlari.enDusukPuan).max(yorumSinirlari.enYuksekPuan),
  // Başlık isteğe bağlıdır: boş bırakılırsa yoktur.
  baslik: z.preprocess(
    (deger) => (typeof deger === "string" && deger.trim() === "" ? undefined : deger),
    duzMetin(yorumSinirlari.baslik).optional(),
  ),
  metin: duzMetin(yorumSinirlari.metin),
  // Müşterinin adı ve soyadı; kayda kısaltılmış girer (bicimleyici.kisaAd).
  // Ad harf taşır; e-posta ya da bağlantı ad olarak yayınlanmaz (bağımsız kontrolün bulgusu).
  ad: duzMetin(yorumSinirlari.ad).refine(
    (deger) => /\p{L}/u.test(deger) && !/[@/\\]|:\/\/|www\./iu.test(deger),
    "metin-gecersiz",
  ),
});
export type YorumFormu = z.output<typeof yorumFormuSemasi>;

export const yorumGirdisi = yorumFormuSemasi.extend({ robotCevabi: robotCevabiSemasi });

// Müşteri bu ürüne yorum yazabilir mi (GET, sorgu kısmından).
export const yorumIzniSemasi = z.strictObject({ urun: kimlikSemasi });

// Panel listesinin toplu kararı (kart 0277): en çok bir sayfanın yorumları.
export const yorumTopluIslemiSemasi = z.strictObject({
  islem: z.enum(yorumTopluIslemKodlari as [YorumTopluIslemi, ...YorumTopluIslemi[]]),
  yorumlar: z
    .array(kimlikSemasi)
    .min(1)
    .max(panelSayfaBoylari[panelSayfaBoylari.length - 1] ?? 100),
});

export const yorumKarariSemasi = z.strictObject({
  yorum: kimlikSemasi,
  durum: z.enum(yorumKararlari),
});

export const yorumAnaSayfaSemasi = z.strictObject({
  yorum: kimlikSemasi,
  anaSayfada: z.boolean(),
});
