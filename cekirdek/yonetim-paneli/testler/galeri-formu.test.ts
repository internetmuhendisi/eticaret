// Ürün ekranının galeri kuralları (kart 0266): girdi yalnız değişince ve ekranın gördüğü kayıtlı öğelerle gider;
// kayıtlı öğe kimliği ve metniyle, yeni görsel dosyasıyla, yeni video bağlantısıyla; ana görsel ilk görseldir (video
// değil); küçük görsel uyarısı en uzun kenara bakar, ölçüsü bilinmeyen görselde ve videoda yoktur.
import { describe, expect, it } from "vitest";
import { galeriOnerilenEnAz } from "../../kayitlar/gorsel.ts";
import {
  anaGorselAnahtari,
  type GaleriFormOgesi,
  galeriGirdisi,
  kucukGorselMi,
} from "../urunler/galeri-formu.ts";

const k1 = "11111111-1111-4111-8111-111111111111";
const k2 = "22222222-2222-4222-8222-222222222222";
const d3 = "33333333-3333-4333-8333-333333333333";

const gorsel: GaleriFormOgesi = {
  anahtar: k1,
  kimlik: k1,
  tur: "gorsel",
  alternatifMetin: "Ön",
  dosya: d3,
  genislik: 1200,
  yukseklik: 900,
};
const video: GaleriFormOgesi = {
  anahtar: k2,
  kimlik: k2,
  tur: "video",
  alternatifMetin: "Tanıtım",
  site: "youtube",
  videoKimligi: "dQw4w9WgXcQ",
};

describe("galeri girdisi", () => {
  it("değişmeyen galeri gitmez", () => {
    expect(galeriGirdisi([gorsel, video], [gorsel, video])).toBeUndefined();
  });

  it("sıra, metin, yeni görsel ve yeni video son hâliyle; görülen kayıtlı öğeler bilinen hâlden", () => {
    const yeniGorsel: GaleriFormOgesi = {
      anahtar: "yeni:1",
      tur: "gorsel",
      alternatifMetin: "Arka",
      dosya: d3,
    };
    const yeniVideo: GaleriFormOgesi = {
      anahtar: "yeni:2",
      tur: "video",
      alternatifMetin: "Kullanım",
      video: "https://youtu.be/dQw4w9WgXcQ",
      site: "youtube",
      videoKimligi: "dQw4w9WgXcQ",
    };
    expect(
      galeriGirdisi(
        [{ ...video, alternatifMetin: "Yeni başlık" }, yeniGorsel, yeniVideo],
        [gorsel, video],
      ),
    ).toEqual({
      gorulen: [k1, k2],
      ogeler: [
        { kimlik: k2, alternatifMetin: "Yeni başlık" },
        { dosya: d3, alternatifMetin: "Arka" },
        { video: "https://youtu.be/dQw4w9WgXcQ", alternatifMetin: "Kullanım" },
      ],
    });
  });

  it("boşaltılan galeri boş listeyle gider", () => {
    expect(galeriGirdisi([], [gorsel])).toEqual({ gorulen: [k1], ogeler: [] });
  });
});

describe("ana görsel ve küçük görsel", () => {
  it("ana görsel ilk görseldir, video atlanır; görselsiz galeride yoktur", () => {
    expect(anaGorselAnahtari([video, gorsel])).toBe(k1);
    expect(anaGorselAnahtari([video])).toBeUndefined();
  });

  it("en uzun kenar önerilenden kısaysa uyarılır", () => {
    const enAz = galeriOnerilenEnAz;
    expect(kucukGorselMi({ ...gorsel, genislik: enAz - 1, yukseklik: 100 })).toBe(true);
    expect(kucukGorselMi({ ...gorsel, genislik: 100, yukseklik: enAz })).toBe(false);
    expect(kucukGorselMi({ ...gorsel, genislik: enAz, yukseklik: enAz - 1 })).toBe(false);
    const { genislik: _g, yukseklik: _y, ...olcusuz } = gorsel;
    expect(kucukGorselMi(olcusuz)).toBe(false);
    expect(kucukGorselMi(video)).toBe(false);
  });
});
