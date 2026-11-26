// @vitest-environment jsdom
// Vergi ekranı (kart 0322): genel ayarlar formu yalnız değişince kaydedilir ve bütün ayarları gönderir; kendi metni
// yalnız "kendi" türünde alan olarak çıkar; alanın hatası alanın altında ve odakta; fiyat girişi yalnız yazı olarak
// görünür; sınıf satırı oranı, ürün sayısını ve kargo işaretini söyler; sınıf silme onayı bağlı ürün sayısını söyler ve
// onaylanınca uca gider; sınıf penceresinde oran eklenir; izni olmayan yönetici alanları kapalı, düğmeleri yok görür.
// Uç sahte fetch ile verilir.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { doldur } from "../../metinler/doldur.ts";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { VergiEkrani } from "../vergi/ekran.tsx";
import type { VergiEkraniVerisi } from "../vergi/veri.ts";

const yenile = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: yenile, push: vi.fn() }),
  usePathname: () => "/yonetim/vergi",
}));

const metin = metinOkuyucu("tr");

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const istekler: { adres: string; govde: unknown }[] = [];
let yanit: () => Response;
beforeEach(() => {
  istekler.length = 0;
  yenile.mockClear();
  yanit = () => Response.json({ basarili: true, veri: {} });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (adres: string, secenek?: RequestInit) => {
      istekler.push({
        adres,
        govde: secenek?.body === undefined ? undefined : JSON.parse(String(secenek.body)),
      });
      return yanit();
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const genel = "5a0d6c1e-2f3b-4c8d-9e7a-1b2c3d4e5f01";
const indirimli = "5a0d6c1e-2f3b-4c8d-9e7a-1b2c3d4e5f02";
const veri = (): VergiEkraniVerisi => ({
  ayarlar: {
    vergiAcik: true,
    vergiAdi: "Deneme Vergisi",
    fiyatGirisi: "vergi-dahil",
    fiyatGosterimi: "vergi-dahil",
    fiyatEkMetniTuru: "otomatik",
    fiyatEkMetni: "",
    vergiAdresi: "teslimat",
    vergiYuvarlama: "satir",
    kargoSinifi: genel,
  },
  otomatikEkMetin: "Deneme Vergisi dahil",
  siniflar: [
    {
      kimlik: genel,
      ad: "Genel",
      kargo: true,
      urunSayisi: 12,
      oranlar: [
        {
          kimlik: "5a0d6c1e-2f3b-4c8d-9e7a-1b2c3d4e5f11",
          ulke: "TR",
          il: null,
          postaKodu: null,
          ulkeAdi: "Türkiye",
          ilAdi: null,
          oranYazisi: "18",
          ad: "",
          ozet: "%18 · Türkiye",
        },
      ],
    },
    { kimlik: indirimli, ad: "İndirimli", kargo: false, urunSayisi: 0, oranlar: [] },
  ],
  silinmisKargoSinifi: null,
  ulkeler: [{ kod: "TR", ad: "Türkiye", iller: [{ kod: "TR-06", ad: "Ankara" }] }],
});

const ciz = (izinli = true, v: VergiEkraniVerisi = veri()) =>
  render(
    <MetinSaglayici dil="tr">
      <VergiEkrani veri={v} izinli={izinli} />
    </MetinSaglayici>,
  );
const kaydet = () => screen.getByRole("button", { name: metin("yonetim.vergi.kaydet") });
const vergiAdi = () => screen.getByLabelText(metin("yonetim.vergi.vergiAdi"), { exact: false });
const radyo = (ad: string) => screen.getByRole("radio", { name: ad });

describe("genel ayarlar", () => {
  it("değişiklik yokken kaydedilmez; değişince bütün ayarları gönderir, fiyat girişi gönderilmez", async () => {
    ciz();
    expect(
      kaydet().getAttribute("aria-disabled") === "true" || (kaydet() as HTMLButtonElement).disabled,
    ).toBe(true);
    // Fiyat girişi yazı olarak görünür, seçilemez.
    expect(screen.getByText(metin("yonetim.vergi.fiyatGirisi"))).toBeDefined();
    fireEvent.change(vergiAdi(), { target: { value: "Yeni Vergi" } });
    fireEvent.click(radyo(metin("yonetim.vergi.fiyatGirisiDeger.vergi-haric")));
    await act(async () => {
      fireEvent.click(kaydet());
    });
    expect(istekler).toEqual([
      {
        adres: "/kapi/yonetici/vergi-ayarlari",
        govde: {
          vergiAcik: true,
          vergiAdi: "Yeni Vergi",
          fiyatGosterimi: "vergi-haric",
          fiyatEkMetniTuru: "otomatik",
          fiyatEkMetni: "",
          vergiAdresi: "teslimat",
          vergiYuvarlama: "satir",
          kargoSinifi: genel,
        },
      },
    ]);
    expect(yenile).toHaveBeenCalled();
  });

  it("kendi metni yalnız 'kendi' türünde alan olarak çıkar; otomatik seçenek örneği söyler", () => {
    ciz();
    const kendiAlani = () =>
      screen.queryByRole("textbox", {
        name: new RegExp(`^${metin("yonetim.vergi.fiyatEkMetniAlani")}`),
      });
    expect(kendiAlani()).toBeNull();
    expect(
      radyo(
        doldur(metin("yonetim.vergi.fiyatEkMetniTuru.otomatik"), { ornek: "Deneme Vergisi dahil" }),
      ),
    ).toBeDefined();
    fireEvent.click(radyo(doldur(metin("yonetim.vergi.fiyatEkMetniTuru.kendi"), { ornek: "" })));
    expect(kendiAlani()).not.toBeNull();
  });

  it("alanın hatası alanın altında ve odakta", async () => {
    ciz();
    fireEvent.change(vergiAdi(), { target: { value: "Ad@" } });
    yanit = () =>
      Response.json(
        {
          basarili: false,
          hata: { kod: "dogrulama", ayrinti: [{ alan: "vergiAdi", kod: "ad-bicimi" }] },
        },
        { status: 400 },
      );
    await act(async () => {
      fireEvent.click(kaydet());
    });
    const alan = vergiAdi();
    expect(alan.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(alan);
    const hata = document.getElementById(
      (alan.getAttribute("aria-describedby") ?? "").split(" ").at(-1) ?? "",
    );
    expect(hata?.textContent).toBe(metin("yonetim.vergi.hata.ad-bicimi"));
  });
});

describe("vergi sınıfları", () => {
  it("satır oranı, ürün sayısını ve kargo işaretini söyler", () => {
    ciz();
    const liste = screen.getByRole("list", { name: metin("yonetim.vergi.siniflar") });
    expect(liste.textContent).toContain(
      doldur(metin("yonetim.vergi.sinifOzetiKargo"), {
        oranlar: "%18 · Türkiye",
        urunler: doldur(metin("yonetim.vergi.urunSayisi"), { sayi: "12" }),
      }),
    );
    expect(liste.textContent).toContain("%18 · Türkiye");
    expect(liste.textContent).toContain(doldur(metin("yonetim.vergi.urunSayisi"), { sayi: "12" }));
    expect(liste.textContent).toContain(metin("yonetim.vergi.oransiz"));
  });

  it("silme onayı bağlı ürün sayısını söyler, onaylanınca uca gider", async () => {
    ciz();
    fireEvent.click(
      screen.getByRole("button", {
        name: doldur(metin("yonetim.vergi.sinifSil"), { ad: "Genel" }),
      }),
    );
    const pencere = screen.getByRole("alertdialog");
    expect(pencere.textContent).toContain(
      doldur(metin("yonetim.vergi.sinifSilOnay.urunler"), { sayi: "12" }),
    );
    await act(async () => {
      fireEvent.click(within(pencere).getByRole("button", { name: metin("yonetim.vergi.sil") }));
    });
    expect(istekler).toEqual([
      { adres: "/kapi/yonetici/vergi-sinifi-sil", govde: { kimlik: genel } },
    ]);
  });

  it("sınıf penceresinde oran eklenir: yazılan oran ve il gider", async () => {
    ciz();
    fireEvent.click(
      screen.getByRole("button", {
        name: doldur(metin("yonetim.vergi.sinifDuzenle"), { ad: "İndirimli" }),
      }),
    );
    const pencere = screen.getByRole("dialog");
    fireEvent.click(within(pencere).getByRole("button", { name: metin("yonetim.vergi.oranEkle") }));
    fireEvent.change(
      within(pencere).getByRole("textbox", {
        name: new RegExp(`^${metin("yonetim.vergi.oranForm.oran")}\\b`),
      }),
      {
        target: { value: "7,5" },
      },
    );
    const formlar = pencere.querySelectorAll("form");
    await act(async () => {
      fireEvent.submit(formlar[formlar.length - 1] as HTMLFormElement);
    });
    expect(istekler).toEqual([
      {
        adres: "/kapi/yonetici/vergi-orani-ekle",
        govde: { sinif: indirimli, oran: { ulke: "TR", oran: "7,5" } },
      },
    ]);
    // Form kapanır, odak "Oran ekle"ye geçer (bağımsız kontrolün bulgusu).
    expect(document.activeElement).toBe(
      within(pencere).getByRole("button", { name: metin("yonetim.vergi.oranEkle") }),
    );
  });

  it("oran silinince satır kalkınca odak 'Oran ekle'ye geçer", async () => {
    const { rerender } = ciz();
    fireEvent.click(
      screen.getByRole("button", {
        name: doldur(metin("yonetim.vergi.sinifDuzenle"), { ad: "Genel" }),
      }),
    );
    const pencere = screen.getByRole("dialog");
    fireEvent.click(
      within(pencere).getByRole("button", {
        name: doldur(metin("yonetim.vergi.oranSil"), { ozet: "%18 · Türkiye" }),
      }),
    );
    const onay = screen.getByRole("alertdialog");
    await act(async () => {
      fireEvent.click(within(onay).getByRole("button", { name: metin("yonetim.vergi.sil") }));
    });
    const yeni = veri();
    const [genelSinif] = yeni.siniflar;
    if (genelSinif !== undefined) genelSinif.oranlar = [];
    await act(async () => {
      rerender(
        <MetinSaglayici dil="tr">
          <VergiEkrani veri={yeni} izinli />
        </MetinSaglayici>,
      );
    });
    // Onay penceresinin kapanınca odağı geri vermesi zamanlayıcıyla gelebilir: bitmesi beklenir, sonra ölçülür.
    await act(async () => {
      await new Promise((coz) => setTimeout(coz, 100));
    });
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: metin("yonetim.vergi.oranEkle") }),
    );
  });

  it("oranın posta kodu hatası kendi metniyle alanın altında", async () => {
    ciz();
    fireEvent.click(
      screen.getByRole("button", {
        name: doldur(metin("yonetim.vergi.sinifDuzenle"), { ad: "İndirimli" }),
      }),
    );
    const pencere = screen.getByRole("dialog");
    fireEvent.click(within(pencere).getByRole("button", { name: metin("yonetim.vergi.oranEkle") }));
    yanit = () =>
      Response.json(
        {
          basarili: false,
          hata: {
            kod: "dogrulama",
            ayrinti: [{ alan: "oran.postaKodu", kod: "posta-kodu-bicimi" }],
          },
        },
        { status: 400 },
      );
    const formlar = pencere.querySelectorAll("form");
    await act(async () => {
      fireEvent.submit(formlar[formlar.length - 1] as HTMLFormElement);
    });
    expect(pencere.textContent).toContain(metin("yonetim.vergi.hata.postaKodu"));
  });

  it("silinmiş kargo sınıfı seçim kutusunda adıyla; kargo sınıfının silme onayı kargoyu söyler", () => {
    const v = veri();
    v.ayarlar.kargoSinifi = "5a0d6c1e-2f3b-4c8d-9e7a-1b2c3d4e5f09";
    v.silinmisKargoSinifi = { kimlik: v.ayarlar.kargoSinifi, ad: "Eski" };
    ciz(true, v);
    expect(
      screen.getAllByText(doldur(metin("yonetim.vergi.silinmisSinif"), { ad: "Eski" })).length,
    ).toBeGreaterThan(0);
    cleanup();
    ciz();
    fireEvent.click(
      screen.getByRole("button", {
        name: doldur(metin("yonetim.vergi.sinifSil"), { ad: "Genel" }),
      }),
    );
    expect(screen.getByRole("alertdialog").textContent).toContain(
      metin("yonetim.vergi.sinifSilOnay.kargo"),
    );
  });
});

describe("izni olmayan yönetici", () => {
  it("alanları kapalı görür, kaydet, ekle ve sil düğmeleri yok", () => {
    ciz(false);
    expect((vergiAdi() as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByRole("button", { name: metin("yonetim.vergi.kaydet") })).toBeNull();
    expect(
      screen.queryByRole("button", {
        name: doldur(metin("yonetim.vergi.sinifSil"), { ad: "Genel" }),
      }),
    ).toBeNull();
    expect(screen.queryByText(metin("yonetim.vergi.oranEkle"))).toBeNull();
  });
});
