// Ürün görselinin vitrindeki dosyası (kart 0109, karar 0085). Ürün kartı ve vitrin görseli galeri
// öğesinin kimliği ve boyutun adıyla ister (GET /kapi/herkese-acik/urun-gorseli); dosyanın kimliği
// adreste görünmez, adresle başka bir dosya (logo, başka görselin özgün hâli) okunamaz.
//
// Yalnız vitrinde sayfası açılan ürünün (vitrinKosulu, "sayfa" yeri) canlı galeri görselinin boyutu
// verilir: taslak, arşiv, zamanı gelmemiş ya da silinmiş ürünün, silinmiş öğenin ve silinmiş dosyanın
// görseli yoktur. Özgün görsel verilmez, yalnız kayıttaki boyutlar (cekirdek/kayitlar/gorsel.ts).
// Dosyanın kendisi ortak okumadan gelir (cekirdek/moduller/dosya/gorsel-boyutu.ts): okunamayan dosya 404'tür,
// hata dosya başına bir kez kaydedilir.
import { and, eq } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import type { GorselBoyutu } from "../../kayitlar/gorsel.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { kimlikMi } from "../../veritabani/kimlik.ts";
import { type GorselDosyasi, gorselBoyutunuOku } from "../dosya/gorsel-boyutu.ts";
import { dosyaKlasoru } from "../dosya/servis.ts";
import { siteninMagazaAyarlari } from "../magaza-ayarlari/servis.ts";
import { canliOge } from "./galeri.ts";
import { urunGalerisi, urunler } from "./model.ts";
import { vitrinKosulu } from "./vitrin.ts";

export const urunGorseliYolu = "/kapi/herkese-acik/urun-gorseli";

// Görselin vitrindeki adresi.
export const urunGorseliAdresi = (oge: string, boyut: GorselBoyutu): string =>
  `${urunGorseliYolu}?o=${oge}&b=${boyut}`;

export const urunGorseli = async (
  vt: Veritabani,
  site: Site,
  oge: string,
  boyut: GorselBoyutu,
  secenekler: { an?: Date; klasor?: string } = {},
): Promise<GorselDosyasi | undefined> => {
  if (!kimlikMi(oge)) return undefined;
  const { tukenenUrun } = await siteninMagazaAyarlari(vt, site);
  const [satir] = await vt
    .select({ dosya: urunGalerisi.dosya_kimligi })
    .from(urunGalerisi)
    .innerJoin(urunler, eq(urunler.kimlik, urunGalerisi.urun_kimligi))
    .where(
      and(
        eq(urunGalerisi.kimlik, oge),
        eq(urunGalerisi.tur, "gorsel"),
        canliOge(),
        vitrinKosulu("sayfa", {
          ...(secenekler.an === undefined ? {} : { an: secenekler.an }),
          tukenenUrun,
        }),
      ),
    );
  if (satir?.dosya == null) return undefined;
  return gorselBoyutunuOku(vt, satir.dosya, boyut, secenekler.klasor ?? dosyaKlasoru());
};
