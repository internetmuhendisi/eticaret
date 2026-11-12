// Vitrin görseli (kart 0110, karar 0087): bölümlerdeki ve kategorilerdeki görsellerin vitrindeki dosyası
// (GET /kapi/herkese-acik/vitrin-gorseli). Adres görselin dosya kimliğini ve boyutun adını taşır.
//
// Yalnız vitrinde kullanılan görsel verilir: geçerli düzende çizilen bir bölümün başvurduğu görsel ya da
// silinmemiş bir kategorinin görseli ya da silinmemiş bir markanın logosu (kart 0111; marka sayfası da onu
// gösterecek). Gizli bölümün, silinmiş kategorinin ve markanın, mağaza logosunun, ürün görselinin (o kendi
// ucundadır, karar 0085) ve dosya deposundaki öteki dosyaların görseli bu adresle açılmaz. Özgün görsel
// verilmez, yalnız kayıttaki boyutlar.
import { and, eq, isNull } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import type { GorselBoyutu } from "../../kayitlar/gorsel.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { kimligiDuzelt, kimlikMi } from "../../veritabani/kimlik.ts";
import type { BolumKutuphanesi } from "../../vitrin/bolum-kutuphanesi/duzen.ts";
import { bolumKutuphanesi } from "../../vitrin/bolum-kutuphanesi/kutuphane.ts";
import { type GorselDosyasi, gorselBoyutunuOku } from "../dosya/gorsel-boyutu.ts";
import { dosyaKlasoru } from "../dosya/servis.ts";
import { kategoriler } from "../kategori/model.ts";
import { markalar } from "../marka/model.ts";
import { duzenServisi } from "./servis.ts";

export const vitrinGorseliYolu = "/kapi/herkese-acik/vitrin-gorseli";

// Görselin vitrindeki adresi.
export const vitrinGorseliAdresi = (dosya: string, boyut: GorselBoyutu): string =>
  `${vitrinGorseliYolu}?d=${dosya}&b=${boyut}`;

// Görsel vitrinde kullanılıyor mu: önce kategoriler ve markalar (birer sorgu), sonra düzen.
export const vitrindeKullaniliyorMu = async (
  vt: Veritabani,
  site: Site,
  dosya: string,
  kutuphane: BolumKutuphanesi = bolumKutuphanesi,
): Promise<boolean> => {
  if (!kimlikMi(dosya)) return false;
  const kimlik = kimligiDuzelt(dosya);
  const [kategori] = await vt
    .select({ kimlik: kategoriler.kimlik })
    .from(kategoriler)
    .where(and(eq(kategoriler.gorsel_kimligi, kimlik), isNull(kategoriler.silinme_zamani)))
    .limit(1);
  if (kategori !== undefined) return true;
  const [marka] = await vt
    .select({ kimlik: markalar.kimlik })
    .from(markalar)
    .where(and(eq(markalar.logo_kimligi, kimlik), isNull(markalar.silinme_zamani)))
    .limit(1);
  if (marka !== undefined) return true;
  return (
    await duzenServisi(
      () => site,
      () => kutuphane,
    ).vitrindekiGorseller(vt)
  ).has(kimlik);
};

export const vitrinGorseliOku = async (
  vt: Veritabani,
  site: Site,
  dosya: string,
  boyut: GorselBoyutu,
  secenekler: { klasor?: string; kutuphane?: BolumKutuphanesi } = {},
): Promise<GorselDosyasi | undefined> => {
  if (!(await vitrindeKullaniliyorMu(vt, site, dosya, secenekler.kutuphane))) return undefined;
  return gorselBoyutunuOku(vt, kimligiDuzelt(dosya), boyut, secenekler.klasor ?? dosyaKlasoru());
};
