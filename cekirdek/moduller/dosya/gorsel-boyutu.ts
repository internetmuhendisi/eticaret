// Bir görselin kayıtlı boyutunun dosyası (kartlar 0109, 0110). Vitrinin görsel uçları (ürün görseli, vitrin
// görseli) görselin gösterilip gösterilemeyeceğine kendisi karar verir, dosyayı buradan okur.
//
// Yalnız kayıttaki boyutlar verilir (cekirdek/kayitlar/gorsel.ts), özgün görsel verilmez. Boyutu, boyut
// dosyası ya da kaynağı silinmiş görsel yoktur. Kayıtlı boyutun dosyası okunamazsa (diskte yok, içeriği
// kayıttakinden farklı) görsel yok sayılır: uç 404 verir, sayfa düşmez. Hata her dosya için süreç başına bir
// kez kaydedilir; her görsel isteği hata izleme aracını doldurmaz (kart 0109 kontrolü).
import { createHash } from "node:crypto";
import { hatayiKaydet } from "../../izleme/hata-katmani.ts";
import type { GorselBoyutu } from "../../kayitlar/gorsel.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { dosyaKlasoru, dosyaOku, gorselBoyutlariniOku } from "./servis.ts";

export type GorselDosyasi = { icerik: Buffer; mime: string; etiket: string };

const kaydedilenler = new Set<string>();

export const gorselBoyutunuOku = async (
  vt: Veritabani,
  kaynak: string,
  boyut: GorselBoyutu,
  klasor: string = dosyaKlasoru(),
): Promise<GorselDosyasi | undefined> => {
  const boyutDosyasi = (await gorselBoyutlariniOku(vt, [kaynak])).get(kaynak)?.[boyut];
  if (boyutDosyasi === undefined) return undefined;
  try {
    const dosya = await dosyaOku(vt, boyutDosyasi.kimlik, klasor);
    if (dosya === undefined) return undefined;
    return {
      icerik: dosya.icerik,
      mime: dosya.mime,
      etiket: createHash("sha256").update(dosya.icerik).digest("hex"),
    };
  } catch (hata) {
    if (!kaydedilenler.has(boyutDosyasi.kimlik)) {
      kaydedilenler.add(boyutDosyasi.kimlik);
      hatayiKaydet(hata, { kaynak: "gorsel-boyutu", dosya: boyutDosyasi.kimlik });
    }
    return undefined;
  }
};
