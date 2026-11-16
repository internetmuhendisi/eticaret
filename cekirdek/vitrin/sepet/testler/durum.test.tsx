// @vitest-environment jsdom
// Tarayıcıdaki sepet (kart 0212, karar 0135):
// - Depo: bozuk değer, kimlik olmayan birim, tekrar ve sınır dışı adet atılır; okunamazsa sepet boştur.
// - Ekleme adedi toplar, sepetin kalem sınırını aşamaz; çıkarılan ürün "Geri al" ile eski yerine döner.
// - Sayfa açılınca istek gitmez (üst kısmın sayısı depodan); sepeti gösteren parça varken her değişiklikte tek istek
//   gider, eski cevap yenisini ezmez. Sunucunun gösterdiği birim fiyatı depoya yazılır (fiyat değişikliği bir kez).
// - Başka sekmedeki değişiklik görülür. Katalogun örnek kipinde depo kullanılmaz, istek gitmez.
// - Ürün sayfasında seçim eksikken "Sepete ekle" kapalıdır; seçili birim eklenince ayara göre pencere açılır, bildirim
//   çıkar ya da sepet sayfasına gidilir.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sepetDepoAnahtari, sepetSinirlari } from "../../../kayitlar/sepet.ts";
import { MetinSaglayici } from "../../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../../metinler/metin.ts";
import { doldur } from "../../../moduller/eposta/sablon.ts";
import { SeciliBirimBaglami } from "../../urun-sayfasi/secili-birim.tsx";
import { kalemListesi } from "../depo.ts";
import {
  geriKoy,
  type SepetAyarlari,
  SepetSaglayici,
  sepetDurumunuSifirla,
  sepeteEkle,
  sepettenCikar,
  useSepet,
  useSepetGorunumu,
} from "../durum.ts";
import { SepetSayisi } from "../sepet-sayisi.tsx";
import { SepeteEkleAlani } from "../sepete-ekle.tsx";
import type { SepetGorunumu } from "../veri.ts";

const bildirimler = vi.hoisted(
  () => [] as { tur: string; metin: string; eylem?: { etiket: string; tikla: () => void } }[],
);
vi.mock("../../../../bilesenler/parcalar/bildirim", async (asil) => ({
  ...(await asil<object>()),
  bildirimGoster: (tur: string, metin: string, eylem?: { etiket: string; tikla: () => void }) => {
    bildirimler.push({ tur, metin, ...(eylem === undefined ? {} : { eylem }) });
  },
}));

const metin = metinOkuyucu("tr");
const [a, b, c] = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
];
const sorulur: SepetAyarlari = { kip: "sorulur", sepeteEkleyince: "yan-pencere" };

const gorunum = (satirlar: Partial<SepetGorunumu["satirlar"][number]>[]): SepetGorunumu => ({
  satirlar: satirlar.map((satir) => ({
    birim: a,
    istenenAdet: 1,
    adet: 1,
    enAz: 1,
    enCok: 10,
    satilabilir: true,
    secim: [],
    uyarilar: [],
    ...satir,
  })),
  adet: 1,
  gosterim: "vergi-dahil",
  kargo: "ucretsiz",
  vergiDokumu: [],
  yazili: { araToplam: "1", vergi: "0", toplam: "1" },
  odemeyeGecilebilir: true,
});

const depodakiler = () => JSON.parse(window.localStorage.getItem(sepetDepoAnahtari) ?? "[]");

beforeEach(() => {
  window.localStorage.clear();
  bildirimler.length = 0;
});
afterEach(() => {
  cleanup();
  sepetDurumunuSifirla();
  vi.restoreAllMocks();
});

function Gozlemci({ etkin }: { etkin: boolean }) {
  const sepet = useSepet();
  const durum = useSepetGorunumu(etkin);
  return (
    <>
      <span data-testid="kalemler">{JSON.stringify(sepet.kalemler)}</span>
      <span data-testid="pencere">{String(sepet.pencereAcik)}</span>
      <span data-testid="gorunum">
        {durum.tur === "hazir" ? durum.gorunum.satirlar.length : durum.tur}
      </span>
      <span data-testid="sayi">
        <SepetSayisi ornekSayi={7} className="" />
      </span>
    </>
  );
}

const ciz = (ayarlar: SepetAyarlari = sorulur, etkin = false) =>
  render(
    <MetinSaglayici dil="tr">
      <SepetSaglayici ayarlar={ayarlar}>
        <Gozlemci etkin={etkin} />
      </SepetSaglayici>
    </MetinSaglayici>,
  );

describe("sepetin deposu", () => {
  it("bozuk, tekrar eden ve sınır dışı kalemler atılır; kimlik küçük harfe çevrilir", () => {
    expect(
      kalemListesi([
        { birim: a, adet: 2, gorulenTutar: 100 },
        { birim: a.toUpperCase(), adet: 1 },
        { birim: "bozuk", adet: 1 },
        { birim: b, adet: 0 },
        { birim: b, adet: 1.5 },
        { birim: c, adet: sepetSinirlari.adetEnCok + 1 },
        { birim: c, adet: 3, gorulenTutar: -1 },
        null,
        "metin",
      ]),
    ).toEqual([
      { birim: a, adet: 2, gorulenTutar: 100 },
      { birim: c, adet: 3 },
    ]);
  });

  it("depodaki bozuk değer boş sepettir", () => {
    window.localStorage.setItem(sepetDepoAnahtari, "{bozuk");
    ciz();
    expect(screen.getByTestId("kalemler").textContent).toBe("[]");
  });
});

describe("sepet durumu", () => {
  it("sayfa açılınca istek gitmez; sayı depodan; ekleme adedi toplar ve depoya yazar", () => {
    const istek = vi.spyOn(globalThis, "fetch");
    window.localStorage.setItem(sepetDepoAnahtari, JSON.stringify([{ birim: a, adet: 1 }]));
    ciz();
    expect(screen.getByTestId("sayi").textContent).toBe(
      `${doldur(metin("vitrin.sepet.sayi"), { sayi: "1" })}1`,
    );
    act(() => {
      expect(sepeteEkle(sorulur, a, 2, 500)).toBe("eklendi");
      expect(sepeteEkle(sorulur, b.toUpperCase(), 1)).toBe("eklendi");
    });
    expect(depodakiler()).toEqual([
      { birim: a, adet: 3, gorulenTutar: 500 },
      { birim: b, adet: 1 },
    ]);
    expect(istek).not.toHaveBeenCalled();
  });

  it("kalem ve adet sınırı aşılmaz", () => {
    window.localStorage.setItem(
      sepetDepoAnahtari,
      JSON.stringify(
        Array.from({ length: sepetSinirlari.kalemEnCok }, (_, i) => ({
          birim: `${String(i).padStart(8, "0")}-1111-4111-8111-111111111111`,
          adet: 1,
        })),
      ),
    );
    ciz();
    act(() => {
      expect(sepeteEkle(sorulur, c, 1)).toBe("sinir");
    });
    window.localStorage.clear();
    sepetDurumunuSifirla();
    cleanup();
    ciz();
    act(() => {
      sepeteEkle(sorulur, a, sepetSinirlari.adetEnCok);
      expect(sepeteEkle(sorulur, a, 1)).toBe("adet-siniri");
    });
  });

  it("çıkarılan kalem geri alınınca eski yerine döner", () => {
    window.localStorage.setItem(
      sepetDepoAnahtari,
      JSON.stringify([
        { birim: a, adet: 1 },
        { birim: b, adet: 2 },
        { birim: c, adet: 3 },
      ]),
    );
    ciz();
    let cikan: ReturnType<typeof sepettenCikar>;
    act(() => {
      cikan = sepettenCikar(b);
    });
    expect(depodakiler().map((k: { birim: string }) => k.birim)).toEqual([a, c]);
    act(() => {
      if (cikan !== undefined) geriKoy(cikan.kalem, cikan.sira);
    });
    expect(depodakiler()).toEqual([
      { birim: a, adet: 1 },
      { birim: b, adet: 2 },
      { birim: c, adet: 3 },
    ]);
  });

  it("başka sekmedeki değişiklik görülür", () => {
    ciz();
    act(() => {
      window.localStorage.setItem(sepetDepoAnahtari, JSON.stringify([{ birim: c, adet: 4 }]));
      window.dispatchEvent(new StorageEvent("storage", { key: sepetDepoAnahtari }));
    });
    expect(JSON.parse(screen.getByTestId("kalemler").textContent ?? "")).toEqual([
      { birim: c, adet: 4 },
    ]);
  });

  it("sepeti gösteren parça varken istek gider; her değişiklikte bir istek; eski cevap yenisini ezmez", async () => {
    let bekleyen: ((yanit: Response) => void) | undefined;
    const istekler: unknown[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((_adres, secenek) => {
      const govde = JSON.parse(String(secenek?.body));
      istekler.push(govde);
      // İlk istek geç döner, ikincisi hemen.
      if (istekler.length === 1) {
        return new Promise((coz) => {
          bekleyen = coz;
        });
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            basarili: true,
            veri: gorunum([{ birim: a }, { birim: b, birimTutari: 700 }]),
          }),
        ),
      );
    });
    window.localStorage.setItem(sepetDepoAnahtari, JSON.stringify([{ birim: a, adet: 1 }]));
    ciz(sorulur, true);
    await act(async () => {});
    expect(istekler).toEqual([{ kalemler: [{ birim: a, adet: 1 }] }]);
    await act(async () => {
      sepeteEkle(sorulur, b, 1);
    });
    expect(istekler).toHaveLength(2);
    expect(screen.getByTestId("gorunum").textContent).toBe("2");
    // Geç dönen ilk cevap ekranı eski sepete döndürmez.
    await act(async () => {
      bekleyen?.(new Response(JSON.stringify({ basarili: true, veri: gorunum([{ birim: a }]) })));
    });
    expect(screen.getByTestId("gorunum").textContent).toBe("2");
    // Gösterilen birim fiyatı depoya yazıldı, yeni istek gitmedi.
    expect(depodakiler()).toEqual([
      { birim: a, adet: 1 },
      { birim: b, adet: 1, gorulenTutar: 700 },
    ]);
    expect(istekler).toHaveLength(2);
  });

  it("boş sepette istek gitmez, boş hâl hemen hazırdır", async () => {
    const istek = vi.spyOn(globalThis, "fetch");
    ciz(sorulur, true);
    await act(async () => {});
    expect(screen.getByTestId("gorunum").textContent).toBe("0");
    expect(istek).not.toHaveBeenCalled();
  });

  it("sunucu hatası hata hâlidir", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 500 }));
    window.localStorage.setItem(sepetDepoAnahtari, JSON.stringify([{ birim: a, adet: 1 }]));
    ciz(sorulur, true);
    await act(async () => {});
    expect(screen.getByTestId("gorunum").textContent).toBe("hata");
  });

  it("örnek kipte depo kullanılmaz, istek gitmez; sayı bağlamın örnek sayısıdır", async () => {
    const istek = vi.spyOn(globalThis, "fetch");
    window.localStorage.setItem(sepetDepoAnahtari, JSON.stringify([{ birim: a, adet: 1 }]));
    ciz({ kip: "ornek", sepeteEkleyince: "yan-pencere" }, true);
    await act(async () => {});
    expect(screen.getByTestId("kalemler").textContent).toBe("[]");
    expect(screen.getByTestId("sayi").textContent).toContain("7");
    act(() => {
      sepeteEkle({ kip: "ornek", sepeteEkleyince: "yan-pencere" }, b, 1);
    });
    expect(depodakiler()).toEqual([{ birim: a, adet: 1 }]);
    expect(istek).not.toHaveBeenCalled();
  });
});

describe("ürün sayfasında sepete ekle", () => {
  const alan = (ayarlar: SepetAyarlari, birim: string | undefined) =>
    render(
      <MetinSaglayici dil="tr">
        <SepetSaglayici ayarlar={ayarlar}>
          <SeciliBirimBaglami.Provider value={birim}>
            <SepeteEkleAlani urunAdi="Kupa" birimler={{ [a]: 18_990 }} enAz={2} enCok={6} />
          </SeciliBirimBaglami.Provider>
          <Gozlemci etkin={false} />
        </SepetSaglayici>
      </MetinSaglayici>,
    );
  const ekleDugmesi = () => screen.getByRole("button", { name: metin("vitrin.sepet.sepeteEkle") });

  it("seçim eksikken ya da birim satılamıyorken düğme kapalıdır", () => {
    alan(sorulur, undefined);
    expect(ekleDugmesi()).toHaveProperty("disabled", true);
    cleanup();
    alan(sorulur, b);
    expect(ekleDugmesi()).toHaveProperty("disabled", true);
  });

  it("adet ürünün en az adedinden başlar; eklenince sepet penceresi açılır", () => {
    alan(sorulur, a);
    fireEvent.click(
      screen.getByRole("button", { name: doldur(metin("vitrin.sepet.artir"), { urun: "Kupa" }) }),
    );
    fireEvent.click(ekleDugmesi());
    expect(depodakiler()).toEqual([{ birim: a, adet: 3, gorulenTutar: 18_990 }]);
    expect(screen.getByTestId("pencere").textContent).toBe("true");
    // Adet en az adedin üstünde: azalt açıktır.
    expect(
      screen.getByRole("button", { name: doldur(metin("vitrin.sepet.azalt"), { urun: "Kupa" }) }),
    ).toHaveProperty("disabled", false);
  });

  it('bildirim ayarında pencere açılmaz, "Sepete git"li bildirim çıkar', () => {
    alan({ kip: "sorulur", sepeteEkleyince: "bildirim" }, a);
    fireEvent.click(ekleDugmesi());
    expect(screen.getByTestId("pencere").textContent).toBe("false");
    expect(bildirimler).toEqual([
      {
        tur: "basari",
        metin: doldur(metin("vitrin.sepet.eklendi"), { urun: "Kupa" }),
        eylem: expect.objectContaining({ etiket: metin("vitrin.sepet.sepeteGit") }),
      },
    ]);
  });
});
