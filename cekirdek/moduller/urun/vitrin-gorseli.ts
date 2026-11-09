// Ürün görselinin vitrindeki dosyası (kart 0109, karar 0085). Ürün kartı ve vitrin görseli galeri
// öğesinin kimliği ve boyutun adıyla ister (GET /kapi/herkese-acik/urun-gorseli); dosyanın kimliği
// adreste görünmez, adresle başka bir dosya (logo, başka görselin özgün hâli) okunamaz.
//
// Yalnız vitrinde sayfası açılan ürünün (vitrinKosulu, "sayfa" yeri) canlı galeri görselinin boyutu
// verilir: taslak, arşiv, zamanı gelmemiş ya da silinmiş ürünün, silinmiş öğenin ve silinmiş dosyanın
// görseli yoktur. Özgün görsel verilmez, yalnız kayıttaki boyutlar (cekirdek/kayitlar/gorsel.ts).
//
// Kayıtlı boyutun dosyası okunamazsa (diskte yok, içeriği kayıttakinden farklı) görsel yok sayılır: uç 404
// verir, sayfa düşmez. Hata her dosya için süreç başına bir kez kaydedilir; her görsel isteği aracı
// doldurmaz (kart 0109 kontrolü).
import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { hatayiKaydet } from "../../izleme/hata-katmani.ts";
import type { GorselBoyutu } from "../../kayitlar/gorsel.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { kimlikMi } from "../../veritabani/turler.ts";
import { dosyaKlasoru, dosyaOku, gorselBoyutlariniOku } from "../dosya/servis.ts";
import { siteninMagazaAyarlari } from "../magaza-ayarlari/servis.ts";
import { canliOge } from "./galeri.ts";
import { urunGalerisi, urunler } from "./model.ts";
import { vitrinKosulu } from "./vitrin.ts";

export const urunGorseliYolu = "/kapi/herkese-acik/urun-gorseli";

// Görselin vitrindeki adresi.
export const urunGorseliAdresi = (oge: string, boyut: GorselBoyutu): string =>
  `${urunGorseliYolu}?o=${oge}&b=${boyut}`;

export type VitrinGorseli = { icerik: Buffer; mime: string; etiket: string };

const kaydedilenler = new Set<string>();

const boyutuOku = async (vt: Veritabani, kimlik: string, klasor: string) => {
  try {
    return await dosyaOku(vt, kimlik, klasor);
  } catch (hata) {
    if (!kaydedilenler.has(kimlik)) {
      kaydedilenler.add(kimlik);
      hatayiKaydet(hata, { kaynak: "urun-gorseli", dosya: kimlik });
    }
    return undefined;
  }
};

export const vitrinGorseli = async (
  vt: Veritabani,
  site: Site,
  oge: string,
  boyut: GorselBoyutu,
  secenekler: { an?: Date; klasor?: string } = {},
): Promise<VitrinGorseli | undefined> => {
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
  const boyutDosyasi = (await gorselBoyutlariniOku(vt, [satir.dosya])).get(satir.dosya)?.[boyut];
  if (boyutDosyasi === undefined) return undefined;
  const dosya = await boyutuOku(vt, boyutDosyasi.kimlik, secenekler.klasor ?? dosyaKlasoru());
  if (dosya === undefined) return undefined;
  return {
    icerik: dosya.icerik,
    mime: dosya.mime,
    etiket: createHash("sha256").update(dosya.icerik).digest("hex"),
  };
};
