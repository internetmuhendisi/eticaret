// @vitest-environment jsdom
// Tema ayarları ekranı (kart 0260, karar 0168): alanların temanın açtığı renk ve seçeneklerden çıkması (açılmayanın
// bölümü yok), temanın kendi değerine eşit seçeneği olmayan grupta "Temanın kendi"nin seçili olması, değişiklik
// yokken kaydın kapalı olması, gönderilen ayarlar, okunmayan rengin önerisi ve "Bu tonu kullan" (odak alanda, hata
// kalkar), önerisiz ret, ayar kapalıyken ya da izin yokken ekranın yalnız göstermesi, komut çubuğunda "Önceki hâline
// dön" ve "Tema değiştir". Uç sahte fetch ile verilir.

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ornekRenk } from "../../../bilesenler/tasarim-degerleri/testler/ornek-renkler.ts";
import { doldur } from "../../metinler/doldur.ts";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { TemaAyarlariEkrani, TemaAyarlariEylemleri } from "../tema/ayarlar-ekrani.tsx";
import type { TemaAyarlariVerisi } from "../tema/ayarlar-formu.ts";

const yenile = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: yenile }) }));

const metin = metinOkuyucu("tr");

// Radix'in radyo grubu boyutu ResizeObserver ile izler; jsdom'da yoktur.
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
  yanit = () => Response.json({ basarili: true, veri: { sira: 9 } });
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

const veri = (degisiklik: Partial<TemaAyarlariVerisi> = {}): TemaAyarlariVerisi => ({
  logo: { kaynak: "ilk", adres: "/kapi/herkese-acik/logo?s=0123456789abcdef" },
  enCokDosyaBoyutu: "10 MB",
  dosyaTurleri: "JPEG, PNG veya WebP",
  tema: {
    kod: "canli-carsi",
    ad: "Canlı Çarşı",
    demo: "https://demo.ornek.test/?tema=canli-carsi",
  },
  sira: 4,
  sonYayin: "20 Kasım 2026 16:40",
  degistirilebilir: true,
  renkler: [{ ad: "birincil", temaninRengi: ornekRenk.turuncu }],
  yaziTipleri: {
    secenekler: [
      { kod: "inter-jost", baslik: "Jost Variable, Inter Variable", govde: "Inter Variable" },
      { kod: "manrope", baslik: "Manrope Variable", govde: "Manrope Variable" },
    ],
    eslesen: "inter-jost",
    temaninKendi: { baslik: "Jost Variable, Inter Variable", govde: "Inter Variable" },
  },
  koseler: {
    secenekler: [
      { kod: "keskin", kucuk: "0", orta: "0" },
      { kod: "yuvarlak", kucuk: "8px", orta: "16px" },
    ],
    temaninKendi: { kucuk: "4px", orta: "8px" },
  },
  dugmeBicimleri: { secenekler: [], temaninKendi: { deger: "9999px" } },
  koyuTema: false,
  urunFiltresi: { temaninki: "solda" },
  ...degisiklik,
});

const ciz = (v: TemaAyarlariVerisi, izinli = true, logoIzni = izinli) =>
  render(
    <MetinSaglayici dil="tr">
      <TemaAyarlariEylemleri sira={v.sira} degistirebilir={izinli && v.degistirilebilir} />
      <TemaAyarlariEkrani veri={v} izinli={izinli} logoIzni={logoIzni} />
    </MetinSaglayici>,
  );

const anaRenk = () =>
  screen.getByRole("textbox", { name: metin("yonetim.temaAyarlari.renk.birincil") });
const kaydetDugmesi = () =>
  screen.getByRole("button", { name: metin("yonetim.temaAyarlari.kaydet") }) as HTMLButtonElement;
const grup = (ad: string) => screen.getByRole("radiogroup", { name: ad });
const secili = (ad: string) =>
  within(grup(ad))
    .getAllByRole("radio")
    .filter((radyo) => radyo.getAttribute("aria-checked") === "true")
    .map((radyo) => radyo.textContent);

describe("alanlar temanın açtıklarından çıkar", () => {
  it("açılan renk, seçenekler ve adları; seçeneği olmayan grup yok; eşit seçenek ya da 'Temanın kendi' seçili", () => {
    ciz(veri());
    expect(anaRenk()).toHaveProperty("value", ornekRenk.turuncu);
    expect(
      screen.queryByRole("textbox", { name: metin("yonetim.temaAyarlari.renk.indirim") }),
    ).toBeNull();
    // Yazı tipi seçeneğinin adı yazı tiplerinden: başlık ve gövde aynıysa tek ad.
    expect(
      within(grup(metin("yonetim.temaAyarlari.yaziTipi")))
        .getAllByRole("radio")
        .map((radyo) => radyo.textContent),
    ).toEqual([
      `${metin("yonetim.temaAyarlari.ornekYazi")}${doldur(metin("yonetim.temaAyarlari.yaziTipiCifti"), { baslik: "Jost", govde: "Inter" })}`,
      `${metin("yonetim.temaAyarlari.ornekYazi")}Manrope`,
    ]);
    expect(secili(metin("yonetim.temaAyarlari.yaziTipi"))).toHaveLength(1);
    // Köşelerde temanın kendi değerine eşit seçenek yok: başta "Temanın kendi", seçili.
    const koseler = within(grup(metin("yonetim.temaAyarlari.koseler")))
      .getAllByRole("radio")
      .map((radyo) => radyo.textContent);
    expect(koseler).toEqual([
      metin("yonetim.temaAyarlari.temaninKendi"),
      metin("yonetim.temaAyarlari.kose.keskin"),
      metin("yonetim.temaAyarlari.kose.yuvarlak"),
    ]);
    expect(secili(metin("yonetim.temaAyarlari.koseler"))).toEqual([
      metin("yonetim.temaAyarlari.temaninKendi"),
    ]);
    // Düğme biçimi seçeneği açılmamış: grubu yok.
    expect(
      screen.queryByRole("radiogroup", { name: metin("yonetim.temaAyarlari.dugmeBicimi") }),
    ).toBeNull();
    // Renk açılmayan temada Renkler bölümü yok.
    cleanup();
    ciz(veri({ renkler: [] }));
    expect(screen.queryByRole("group", { name: metin("yonetim.temaAyarlari.renkler") })).toBeNull();
  });
});

describe("kayıt", () => {
  it("değişiklik yokken kapalı; değişince yalnız değişen ayarlar gider, sayfa yenilenir", async () => {
    ciz(veri());
    expect(kaydetDugmesi().disabled).toBe(true);
    fireEvent.change(anaRenk(), { target: { value: ornekRenk.koyuMavi } });
    fireEvent.click(
      within(grup(metin("yonetim.temaAyarlari.koseler"))).getByRole("radio", {
        name: metin("yonetim.temaAyarlari.kose.keskin"),
      }),
    );
    fireEvent.click(screen.getByRole("switch", { name: metin("yonetim.temaAyarlari.koyuTema") }));
    expect(kaydetDugmesi().disabled).toBe(false);
    await act(async () => fireEvent.click(kaydetDugmesi()));
    expect(istekler).toEqual([
      {
        adres: "/kapi/yonetici/tema",
        govde: {
          tema: "canli-carsi",
          ayarlar: { renkler: { birincil: ornekRenk.koyuMavi }, kose: "keskin", koyuTema: true },
        },
      },
    ]);
    expect(yenile).toHaveBeenCalled();
  });

  it("okunmayan renk: hata alanın altında, odak alanda; öneri tek basışla alana gelir, hata kalkar", async () => {
    yanit = () =>
      Response.json(
        {
          basarili: false,
          hata: {
            kod: "dogrulama",
            ayrinti: [
              {
                alan: "ayarlar.renkler.birincil",
                kod: "kontrast-yetersiz",
                oneri: ornekRenk.ortaGri,
              },
            ],
          },
        },
        { status: 400 },
      );
    ciz(veri());
    fireEvent.change(anaRenk(), { target: { value: ornekRenk.siyah } });
    await act(async () => fireEvent.click(kaydetDugmesi()));
    const hata = screen.getByText(metin("yonetim.temaAyarlari.hata.kontrast"));
    expect(anaRenk().getAttribute("aria-invalid")).toBe("true");
    expect(anaRenk().getAttribute("aria-describedby")).toContain(hata.id);
    expect(document.activeElement).toBe(anaRenk());
    expect(
      screen.getByText(doldur(metin("yonetim.temaAyarlari.oneri"), { renk: ornekRenk.ortaGri })),
    ).toBeDefined();
    fireEvent.click(
      screen.getByRole("button", {
        name: doldur(metin("yonetim.temaAyarlari.oneriKullanEtiketi"), {
          ad: metin("yonetim.temaAyarlari.renk.birincil"),
          renk: ornekRenk.ortaGri,
        }),
      }),
    );
    expect(anaRenk()).toHaveProperty("value", ornekRenk.ortaGri);
    expect(document.activeElement).toBe(anaRenk());
    expect(screen.queryByText(metin("yonetim.temaAyarlari.hata.kontrast"))).toBeNull();
    expect(screen.queryByRole("button", { name: new RegExp(ornekRenk.ortaGri) })).toBeNull();
    yanit = () => Response.json({ basarili: true, veri: { sira: 5 } });
    await act(async () => fireEvent.click(kaydetDugmesi()));
    expect(istekler.at(-1)?.govde).toEqual({
      tema: "canli-carsi",
      ayarlar: { renkler: { birincil: ornekRenk.ortaGri }, koyuTema: false },
    });
  });

  it("önerisiz okunmayan renk ve bozuk kod kendi metniyle; öneri kutusu yok", async () => {
    yanit = () =>
      Response.json(
        {
          basarili: false,
          hata: {
            kod: "dogrulama",
            ayrinti: [{ alan: "ayarlar.renkler.birincil", kod: "kontrast-yetersiz" }],
          },
        },
        { status: 400 },
      );
    ciz(veri());
    fireEvent.change(anaRenk(), { target: { value: ornekRenk.cokKoyuGri } });
    await act(async () => fireEvent.click(kaydetDugmesi()));
    expect(screen.getByText(metin("yonetim.temaAyarlari.hata.kontrastOnerisiz"))).toBeDefined();
    expect(
      screen.queryByRole("button", { name: metin("yonetim.temaAyarlari.oneriKullan") }),
    ).toBeNull();
    yanit = () =>
      Response.json(
        {
          basarili: false,
          hata: {
            kod: "dogrulama",
            ayrinti: [{ alan: "ayarlar.renkler.birincil", kod: "invalid_format" }],
          },
        },
        { status: 400 },
      );
    fireEvent.change(anaRenk(), { target: { value: ornekRenk.kisaBicim } });
    await act(async () => fireEvent.click(kaydetDugmesi()));
    expect(screen.getByText(metin("yonetim.temaAyarlari.hata.bicim"))).toBeDefined();
  });
});

describe("yalnız gösteren ekran", () => {
  it.each([
    ["ayar kapalı", veri({ degistirilebilir: false }), true],
    ["izin yok", veri(), false],
  ])("%s: kayıt, geri dönüş ve logo düğmeleri yok; alanlar kapalı", (_ad, v, izinli) => {
    ciz(v, izinli, false);
    expect(screen.queryByRole("button", { name: metin("yonetim.temaAyarlari.kaydet") })).toBeNull();
    expect(screen.queryByRole("button", { name: metin("yonetim.eylem.oncekiHaleDon") })).toBeNull();
    expect(screen.queryByRole("button", { name: metin("yonetim.tema.logo.yukle") })).toBeNull();
    expect(anaRenk()).toHaveProperty("disabled", true);
    expect(
      within(grup(metin("yonetim.temaAyarlari.koseler")))
        .getAllByRole("radio")
        .every((radyo) => radyo.getAttribute("aria-disabled") === "true"),
    ).toBe(true);
    expect(
      screen.getByRole("switch", { name: metin("yonetim.temaAyarlari.koyuTema") }),
    ).toHaveProperty("disabled", true);
    const neden = screen.queryByText(metin("yonetim.tema.kapali"));
    expect(neden === null).toBe(v.degistirilebilir);
  });
});

describe("komut çubuğu", () => {
  it("önceki hâline dön ekranın gördüğü sürümü gönderir, çift basış tek istek; tema değiştir temanın sayfasına gider", async () => {
    ciz(veri());
    expect(
      screen.getByRole("link", { name: metin("yonetim.eylem.temaDegistir") }).getAttribute("href"),
    ).toBe("/yonetim/tema");
    const dugme = screen.getByRole("button", { name: metin("yonetim.eylem.oncekiHaleDon") });
    await act(async () => {
      fireEvent.click(dugme);
      fireEvent.click(dugme);
    });
    expect(istekler).toEqual([{ adres: "/kapi/yonetici/tema-geri-don", govde: { son: 4 } }]);
  });

  it("tek sürümde geri dönüş yok", () => {
    ciz(veri({ sira: 1 }));
    expect(screen.queryByRole("button", { name: metin("yonetim.eylem.oncekiHaleDon") })).toBeNull();
  });
});
