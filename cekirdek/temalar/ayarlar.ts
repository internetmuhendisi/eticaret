// Mağaza sahibinin tema ayarları (kart 0105, .claude/rules/tasarim-sistemi.md). Mağaza sahibi yalnız
// temanın açtığı değerleri değiştirir:
// - renkler: temanın açtığı her renk için tek bir renk. Açık temada okunur olmalı, değilse kaydedilmez ve
//   okunur en yakın ton önerilir. Koyu temada okunur değilse vitrin onun okunur tonunu kullanır
//   (birlesim.ts; kullanıcı kararı: mağaza sahibi tek renk seçer).
// - yaziTipi, kose, dugmeBicimi: temanın seçeneklerinden birinin kodu. Seçilmemişse temanın kendi değeri.
// - koyuTema: vitrinde koyu tema (cihazın tercihine göre) açık mı. Varsayılan kapalıdır.
// - urunFiltresi: masaüstünde ürün listesindeki filtrenin yeri (kart 0148). Seçilmemişse temanın görünümü. Her
//   temada iki yer de seçilebilir; temaya bağlı değildir, tema değişince kalır.
//
// Değerler sitenin veritabanında sürüm sürüm saklanır (cekirdek/moduller/tema/).
import { z } from "zod";
import { renkSemasi } from "../../bilesenler/tasarim-degerleri/css.ts";
import { type RenkAdi, renkAdlari } from "../../bilesenler/tasarim-degerleri/degerler.ts";
import { urunFiltresiGorunumleri } from "../kayitlar/tema.ts";
import { okunmayanCiftler, okunurRenk } from "./okunurluk.ts";
import { kodSemasi, type TemaTanimi } from "./sema.ts";

export const temaAyarlariSemasi = z.strictObject({
  renkler: z
    .partialRecord(
      z.enum(renkAdlari),
      renkSemasi.transform((renk) => renk.toUpperCase()),
    )
    .default({}),
  yaziTipi: kodSemasi.optional(),
  kose: kodSemasi.optional(),
  dugmeBicimi: kodSemasi.optional(),
  koyuTema: z.boolean().default(false),
  urunFiltresi: z.enum(urunFiltresiGorunumleri).optional(),
});
export type TemaAyarlari = z.output<typeof temaAyarlariSemasi>;
export type TemaAyarlariGirdisi = z.input<typeof temaAyarlariSemasi>;

// Ayarın temaya göre hata kodları.
export const temaAyariHatalari = [
  "renk-degistirilemez",
  "secenek-tanimsiz",
  "kontrast-yetersiz",
] as const;
export type TemaAyariHatasi = (typeof temaAyariHatalari)[number];

// oneri: kontrastı yetersiz rengin okunur en yakın tonu (yoksa verilmez).
export type TemaAyariSorunu = { alan: string; kod: TemaAyariHatasi; oneri?: string };

// Ayarların temanın renkleri arasına konmuş hâli (açık tema).
const acikRenkler = (tema: TemaTanimi, ayarlar: TemaAyarlari): Record<RenkAdi, string> => ({
  ...tema.degerler.renkler.acik,
  ...ayarlar.renkler,
});

// Ayarların seçilen temaya göre sorunları. Boşsa ayarlar bu temayla kaydedilebilir.
export const temaAyariSorunlari = (tema: TemaTanimi, ayarlar: TemaAyarlari): TemaAyariSorunu[] => {
  const sorunlar: TemaAyariSorunu[] = [];
  const secenekler = tema.magazaSecenekleri;
  const olcu = {
    renkler: acikRenkler(tema, ayarlar),
    baglar: tema.degerler.renkBaglari,
    mod: "acik" as const,
  };
  for (const [ad, renk] of Object.entries(ayarlar.renkler) as [RenkAdi, string][]) {
    const alan = `renkler.${ad}`;
    if (!secenekler.renkler.includes(ad)) {
      sorunlar.push({ alan, kod: "renk-degistirilemez" });
      continue;
    }
    if (okunmayanCiftler(olcu, ad).length > 0) {
      const oneri = okunurRenk(olcu, ad, renk);
      sorunlar.push({ alan, kod: "kontrast-yetersiz", ...(oneri === undefined ? {} : { oneri }) });
    }
  }
  const gruplar = [
    ["yaziTipi", secenekler.yaziTipleri],
    ["kose", secenekler.koseler],
    ["dugmeBicimi", secenekler.dugmeBicimleri],
  ] as const;
  for (const [alan, grup] of gruplar) {
    const kod = ayarlar[alan];
    if (kod !== undefined && !Object.hasOwn(grup, kod)) {
      sorunlar.push({ alan, kod: "secenek-tanimsiz" });
    }
  }
  return sorunlar;
};

// Sorunlu ayarları atar, gerisini korur (kart 0148). Vitrin kayıtlı ayarlardan temaya uymayanı atar (kontrastı
// sonradan yetersiz kalan renk hariç, birleşim onun okunur tonunu kullanır); tema ekranı yeni temaya geçerken
// yeni temanın kabul etmediği her ayarı atar. Temaya bağlı olmayan ayarlar (koyu tema, filtrenin yeri) kalır.
export const sorunluAyarlariAt = (
  ayarlar: TemaAyarlari,
  sorunlar: readonly Pick<TemaAyariSorunu, "alan">[],
): TemaAyarlari => {
  const sonuc = structuredClone(ayarlar);
  for (const { alan } of sorunlar) {
    if (alan.startsWith("renkler.")) {
      delete sonuc.renkler[alan.slice("renkler.".length) as RenkAdi];
    } else if (alan === "yaziTipi" || alan === "kose" || alan === "dugmeBicimi") {
      delete sonuc[alan];
    }
  }
  return sonuc;
};

// Yeni temaya geçerken kalan ayarlar: yeni temanın kabul etmediği renk ve seçenek atılır.
export const yeniTemaninAyarlari = (tema: TemaTanimi, ayarlar: TemaAyarlari): TemaAyarlari =>
  sorunluAyarlariAt(ayarlar, temaAyariSorunlari(tema, ayarlar));

// Vitrinin parça görünümleri: temanın seçimi, mağaza sahibinin seçtiği filtre yeriyle (kart 0148). Vitrin bağlamı
// ve ürün listesi görünümleri yalnız buradan okur.
export const parcaGorunumleriniKur = (
  tema: TemaTanimi,
  ayarlar: TemaAyarlari,
): Readonly<Record<string, string>> => ({
  ...tema.gorunumler,
  ...(ayarlar.urunFiltresi === undefined ? {} : { "urun-filtresi": ayarlar.urunFiltresi }),
});
