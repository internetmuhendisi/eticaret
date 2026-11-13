// Vitrin bölümleri ekranının verisi (kart 0172): vitrinde içeriği boş kalan bölüm nedeniyle işaretlenir; vitrinin
// bağlamı okunamazsa ekran düşmez, hata kaydedilir ve boşluk bilgisi olmadan açılır (bağımsız kontrolün bulgusu).
import { beforeEach, describe, expect, it, vi } from "vitest";

const okuma = vi.hoisted(() => ({ baglam: vi.fn(), hata: vi.fn() }));
const bolum = (kimlik: string, tur: string) => ({
  kimlik,
  tur,
  gorunum: "sutunlu",
  gizli: false,
  degerler: { menu: "bos" },
});

vi.mock("../../ayar-semasi/calisan-site", () => ({ calisanSite: () => ({}) }));
vi.mock("../../veritabani/baglanti", () => ({ siteninVeritabani: () => ({}) }));
vi.mock("../../moduller/duzen/secenekler", () => ({ duzenSecenekleri: async () => ({}) }));
vi.mock("../../moduller/duzen/servis", () => ({
  duzenServisi: () => ({
    panelDuzenDurumu: async () => ({
      sira: 3,
      alanlar: {
        "ust-kisim": [],
        "ana-sayfa": [],
        "alt-kisim": [{ bolum: bolum("b-1", "baglanti-sutunlari"), cizilir: true }],
      },
    }),
  }),
}));
vi.mock("../../vitrin/baglam-oku", () => ({ vitrinBaglaminiOku: okuma.baglam }));
vi.mock("../../izleme/hata-katmani", () => ({ hatayiKaydet: okuma.hata }));

const { bolumlerEkraniVerisi } = await import("../vitrin-bolumleri/veri");

beforeEach(() => {
  okuma.baglam.mockReset();
  okuma.hata.mockReset();
});

describe("vitrin bölümleri ekranının verisi", () => {
  it("boş menüye bağlı bölüm vitrinde görünmüyor sayılır ve nedenini alır", async () => {
    okuma.baglam.mockResolvedValue({ menuler: {} });
    const veri = await bolumlerEkraniVerisi();
    if (veri.durum !== "hazir") throw new Error(veri.durum);
    expect(veri.alanlar["alt-kisim"][0]).toMatchObject({
      cizilir: false,
      neden: "yonetim.duzen.neden.bos.baglanti-sutunlari",
    });
  });

  it("bağlam okunamazsa ekran düşmez: hata kaydedilir, bölüm boşluk bilgisi olmadan çizilir sayılır", async () => {
    const hata = new Error("bozuk mağaza ayarı");
    okuma.baglam.mockRejectedValue(hata);
    const veri = await bolumlerEkraniVerisi();
    if (veri.durum !== "hazir") throw new Error(veri.durum);
    expect(veri.alanlar["alt-kisim"][0]).toMatchObject({ cizilir: true });
    expect(veri.alanlar["alt-kisim"][0]?.neden).toBeUndefined();
    expect(okuma.hata).toHaveBeenCalledWith(hata, { kaynak: "panel-vitrin-baglami" });
  });
});
