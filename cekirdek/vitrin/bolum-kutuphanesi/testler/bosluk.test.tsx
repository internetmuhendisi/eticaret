// Vitrinde içeriği boş kaldığı için çizilmeyen bölümler (kart 0172): panel boşluğu görünüşün kullandığı işlevle
// bulur (bolumBosluklari). Her türün katalog örneği için örnek bağlamda ve içi boşaltılmış bağlamda "boş" kararı
// görünüşün hiçbir şey çizmemesiyle aynıdır: iki ayrı kural yoktur. Kayıttaki her tür kütüphanededir.
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";
import { siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import {
  ornekAltKisim,
  ornekAnaSayfa,
  ornekBaglam,
  ornekIslevBolumleri,
  ornekUrunBolumleri,
  ornekUstKisim,
} from "../../../katalog/ornek-baglam.ts";
import { MetinSaglayici } from "../../../metinler/istemci-metni.tsx";
import type { VitrinBaglami } from "../baglam.ts";
import type { BolumOrnegi } from "../duzen.ts";
import { bolumBosluklari, bolumGorunumleri } from "../gorunumler.tsx";
import { bolumKutuphanesi } from "../kutuphane.ts";

beforeAll(() => {
  (globalThis as Record<symbol, unknown>)[Symbol.for("cekirdek.calisanSite")] = siteKlasorunuOku(
    resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/gecerli"),
  );
});

const an = new Date("2030-01-15T12:00:00Z");
type BosOlabilen = keyof typeof bolumBosluklari;
const bosOlabilirMi = (tur: string): tur is BosOlabilen => Object.hasOwn(bolumBosluklari, tur);

const cizim = (bolum: BolumOrnegi, baglam: VitrinBaglami) => {
  const Gorunum = bolumGorunumleri[bolum.tur];
  if (Gorunum === undefined) throw new Error(`görünüş yok: ${bolum.tur}`);
  return renderToStaticMarkup(
    <MetinSaglayici dil="tr">
      <Gorunum gorunum={bolum.gorunum} degerler={bolum.degerler} baglam={baglam} />
    </MetinSaglayici>,
  );
};

// İçi boşaltılmış bağlam: ürün, menü, kategori, marka, yorum, yazı, iletişim, sosyal hesap, ödeme, bülten yok.
const bosBaglam = (): VitrinBaglami => ({
  ...ornekBaglam(an),
  urunler: {},
  menuler: {},
  kategoriMenuleri: [],
  kategoriler: {},
  markalar: {},
  yorumlar: {},
  blogYazilari: {},
  iletisim: {},
  sosyalHesaplar: [],
  odemeIsaretleri: [],
  bultenKaydi: undefined,
  yerTutucular: {},
});

const ornekler = () =>
  [
    ...ornekUstKisim(),
    ...ornekAltKisim(),
    ...ornekAnaSayfa(),
    ...ornekUrunBolumleri(),
    ...ornekIslevBolumleri(),
  ].filter((bolum) => bosOlabilirMi(bolum.tur));

describe("bölümlerin boşluğu", () => {
  it("kayıttaki her tür kütüphanededir ve katalogda örneği vardır", () => {
    const turler = new Set(ornekler().map((bolum) => bolum.tur));
    for (const tur of Object.keys(bolumBosluklari)) {
      expect(Object.hasOwn(bolumKutuphanesi, tur), tur).toBe(true);
      expect(turler.has(tur), tur).toBe(true);
    }
  });

  it("örnek bağlamda hiçbir örnek boş değildir ve çizilir", () => {
    const baglam = ornekBaglam(an);
    for (const bolum of ornekler()) {
      if (!bosOlabilirMi(bolum.tur)) continue;
      expect(bolumBosluklari[bolum.tur](bolum.degerler, baglam), bolum.kimlik).toBe(false);
      expect(cizim(bolum, baglam), bolum.kimlik).not.toBe("");
    }
  });

  it("boş kararı görünüşün hiçbir şey çizmemesiyle aynıdır; boş bağlamda veriye bağlı türler boştur", () => {
    const baglam = bosBaglam();
    const boslar = new Set<string>();
    for (const bolum of ornekler()) {
      if (!bosOlabilirMi(bolum.tur)) continue;
      const bos = bolumBosluklari[bolum.tur](bolum.degerler, baglam);
      expect(cizim(bolum, baglam) === "", bolum.kimlik).toBe(bos);
      if (bos) boslar.add(bolum.tur);
    }
    // Güven şeridinin yer tutucusuz maddesi bağlamsız da çizilir; ötekiler veri olmadan boştur.
    expect([...boslar].sort()).toEqual(
      Object.keys(bolumBosluklari)
        .filter((tur) => tur !== "guven-seridi")
        .sort(),
    );
  });
});
