// Testlerin ortak yardımcısı (kart 0264). Ürüne seçenek eklenince basit ürünün birimi ilk değerlerin birleşimi olur
// (karar 0163). Birleşimlerini kendisi kuran testler birleşimsiz üründen başlar: dönüşen birim silinir. Eski kuralda
// basit birim silinirdi; ürünün durumu (bir silinmiş birim, canlı birleşim yok) aynıdır.
import { type DegisikligiYapan, sistemIslemi } from "../../../kayitlar/degisiklik-islemleri.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import type { urunServisi } from "../servis.ts";

export const donusenBirimiSil = async (
  servis: Pick<ReturnType<typeof urunServisi>, "urunuOku" | "birlesimSil">,
  vt: Veritabani,
  urun: string,
  kim: DegisikligiYapan = sistemIslemi("test"),
) => {
  const birimler = (await servis.urunuOku(vt, urun))?.birimler.filter((b) => !b.silindi) ?? [];
  for (const birim of birimler) await servis.birlesimSil(vt, kim, birim.kimlik);
};
