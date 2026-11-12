// Önerilen sıralamanın tek yazıcısı (kart 0136, kullanıcı kararı: tek genel sıra). Mağaza sahibi öne
// almak istediği ürünleri sırasıyla verir; listedeki ürünler 1'den başlayarak sıralanır, listede olmayan
// her ürünün sırası kalkar. Vitrin listeleri "önerilen"de önce bu sırayla, sonra sırası olmayanları en yeni
// önce gösterir (vitrin/urun-listesi/veri.ts). Panelin sıralama ekranı bu işlevi çağırır.
//
// - Liste tekrarsızdır; her ürün var olmalı ve silinmemiş olmalı. Ürünün vitrinde görünüp görünmediğine
//   bakılmaz: taslak ürün de önceden sıralanabilir, yayına girince yerinde görünür.
// - Yalnız sırası değişen ürünler yazılır ve her biri kendi satırıyla değişiklik kaydına girer.
// - Ürün yazmalarının işlem kilidini alır (kilit.ts).
import { and, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { kimligiDuzelt, kimlikMi } from "../../veritabani/kimlik.ts";
import { degisikligiKaydet } from "../degisiklik-kaydi/servis.ts";
import { dogrulamaHatasi } from "./dogrulama.ts";
import { urunKilidiAl } from "./kilit.ts";
import { urunler } from "./model.ts";

// Sıranın üst sınırı: panel bir ekranda bundan fazlasını sıralatmaz.
export const vitrinSirasiSiniri = 500;

export const vitrinSirasiniDegistir = async (
  vt: Veritabani,
  kim: DegisikligiYapan,
  kimlikler: readonly string[],
): Promise<void> => {
  const kucuk = kimlikler.map(kimligiDuzelt);
  if (kucuk.length > vitrinSirasiSiniri) {
    throw dogrulamaHatasi([{ alan: "vitrinSirasi", kod: "vitrin-sirasi-gecersiz" }]);
  }
  if (new Set(kucuk).size !== kucuk.length) {
    throw dogrulamaHatasi([{ alan: "vitrinSirasi", kod: "vitrin-sirasi-tekrar" }]);
  }
  if (!kucuk.every(kimlikMi)) {
    throw dogrulamaHatasi([{ alan: "vitrinSirasi", kod: "vitrin-sirasi-gecersiz" }]);
  }
  await vt.transaction(async (islem) => {
    await urunKilidiAl(islem);
    const bulunan =
      kucuk.length === 0
        ? []
        : await islem
            .select({ kimlik: urunler.kimlik })
            .from(urunler)
            .where(and(inArray(urunler.kimlik, kucuk), isNull(urunler.silinme_zamani)));
    if (bulunan.length !== kucuk.length) {
      throw dogrulamaHatasi([{ alan: "vitrinSirasi", kod: "vitrin-sirasi-gecersiz" }]);
    }
    const yeniSira = new Map(kucuk.map((kimlik, i) => [kimlik, i + 1]));
    // Bugün sırası olan ya da yeni sıraya giren ürünler; silinmiş ürünün sırası da kalkar.
    const eskiler = await islem
      .select({ kimlik: urunler.kimlik, sira: urunler.vitrin_sirasi })
      .from(urunler)
      .where(
        kucuk.length === 0
          ? isNotNull(urunler.vitrin_sirasi)
          : sql`${urunler.vitrin_sirasi} is not null or ${inArray(urunler.kimlik, kucuk)}`,
      );
    for (const { kimlik, sira } of eskiler) {
      const yeni = yeniSira.get(kimlik) ?? null;
      if (yeni === sira) continue;
      await islem
        .update(urunler)
        .set({ vitrin_sirasi: yeni, guncellenme_zamani: sql`now()` })
        .where(sql`${urunler.kimlik} = ${kimlik}`);
      await degisikligiKaydet(islem, {
        kim,
        islem: "urun.vitrin-sirasi",
        kayit: { tur: "urun", kimlik },
        eski: { vitrinSirasi: sira },
        yeni: { vitrinSirasi: yeni },
      });
    }
  });
};
