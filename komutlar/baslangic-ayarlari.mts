// Kart 0201: birim testleri ortak site veritabanına başka bir sitenin mağaza ayarlarını yazmasın.
//
// Mağaza ayarları ilk okumada sitenin başlangıç değeriyle bir kez yazılır (karar 0055). Kontrol hattında birim
// testleri tarayıcı testlerinden önce aynı Örnek Mağaza veritabanında çalışır. Bir test çalışan siteyi başka bir
// siteye çevirip mağaza ayarını okursa başlangıç değerlerini o site yazar ve tarayıcı testleri yanlış adla açılır.
// Bu denetim birim testlerinden sonra kayıtlı her ayarın sitenin kendi başlangıç değeri olduğunu ölçer.
// Hiç yazılmamış ayar sorun değildir: ilk okuma onu doğru siteyle yazar.
import { isDeepStrictEqual } from "node:util";
import { siteKlasorunuOku } from "../cekirdek/ayar-semasi/site-klasoru.ts";
import { magazaAyarlari } from "../cekirdek/moduller/magaza-ayarlari/model.ts";
import { saklanan } from "../cekirdek/moduller/magaza-ayarlari/servis.ts";
import { baglan } from "../cekirdek/veritabani/baglanti.ts";
import { siteVeAdres } from "./site-veritabani.mts";

export type AyarSatiri = { anahtar: string; deger: unknown };

// Başlangıç değerinden farklı kayıtlı ayarların adları. Değerler yazılmaz: mağaza ayarı kişisel bilgi taşıyabilir.
export const baslangictanAyrilanlar = (
  satirlar: AyarSatiri[],
  baslangic: Record<string, unknown>,
): string[] =>
  satirlar
    .filter((satir) => !isDeepStrictEqual(satir.deger, saklanan(baslangic[satir.anahtar])))
    .map((satir) => satir.anahtar)
    .toSorted();

const calistir = async (): Promise<void> => {
  const { ad, adres } = siteVeAdres("baslangic-ayarlari-denetle");
  const site = siteKlasorunuOku(process.argv[2] ?? "");
  const vt = baglan(adres.href);
  try {
    const satirlar = await vt
      .select({ anahtar: magazaAyarlari.anahtar, deger: magazaAyarlari.deger })
      .from(magazaAyarlari);
    const ayrilanlar = baslangictanAyrilanlar(satirlar, site.baslangic);
    if (ayrilanlar.length > 0) {
      console.error(
        `${ad}: ${ayrilanlar.length} mağaza ayarı sitenin başlangıç değeri değil (${ayrilanlar.join(", ")}). Bir test bu veritabanına başka bir sitenin ayarlarını ya da kendi değerini yazmış.`,
      );
      process.exitCode = 1;
      return;
    }
    console.log(
      `temiz       ${ad}: ${satirlar.length} kayıtlı mağaza ayarı sitenin başlangıç değerinde.`,
    );
  } finally {
    await vt.$client.end();
  }
};

if (import.meta.main) await calistir();
