// @vitest-environment jsdom
// Tema ekranı (kart 0148): temaların kartları, seçili temanın işareti, "Demoyu gez" bağlantısı (yeni sekmede,
// siteye özel temada yok), "Bu temayı kullan" penceresinin düzen sorusu (seçimsiz istek gitmez), gönderilen
// tema ve ayarlar, "Önceki hâline dön"ün ekranın gördüğü sürümü göndermesi, komut çubuğunda "Tema ayarları"
// bağlantısı (kart 0260); ayar kapalıyken ya da izin yokken değiştiren düğmelerin hiç olmaması. Uç sahte fetch ile
// verilir.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { doldur } from "../../metinler/doldur.ts";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { TemaEylemleri, TemaIcerigi, TemaSaglayici } from "../tema/ekran.tsx";
import type { TemaEkraniVerisi } from "../tema/veri.ts";

const yenile = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: yenile }) }));

const metin = metinOkuyucu("tr");

// Radix'in radyo grubu boyutu ResizeObserver ile izler; jsdom'da yoktur, gerçek tarayıcıda vardır (tarayıcı testi
// cekirdek/testler/uctan-uca/tema.test.ts).
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

const veri = (degisiklik: Partial<TemaEkraniVerisi> = {}): TemaEkraniVerisi => ({
  sira: 4,
  temalar: [
    {
      kod: "birinci",
      ad: "Birinci",
      kaynak: "cekirdek",
      secili: true,
      demo: "https://demo.ornek.test/?tema=birinci",
      ayarlar: { renkler: {}, koyuTema: true },
    },
    {
      kod: "ikinci",
      ad: "İkinci",
      kaynak: "cekirdek",
      secili: false,
      demo: "https://demo.ornek.test/?tema=ikinci",
      ayarlar: { renkler: {}, koyuTema: true, urunFiltresi: "ustte" },
    },
    {
      kod: "ozel",
      ad: "Özel",
      kaynak: "site",
      secili: false,
      ayarlar: { renkler: {}, koyuTema: false },
    },
  ],
  degistirilebilir: true,
  ...degisiklik,
});

const ciz = (v: TemaEkraniVerisi, izinli = true) =>
  render(
    <MetinSaglayici dil="tr">
      <TemaSaglayici veri={v} izinli={izinli}>
        <TemaEylemleri />
        <TemaIcerigi />
      </TemaSaglayici>
    </MetinSaglayici>,
  );

const kart = (ad: string) => screen.getByRole("group", { name: ad });
const kullanDugmesi = (ad: string) =>
  screen.getByRole("button", { name: doldur(metin("yonetim.tema.kullanEtiketi"), { ad }) });

describe("temaların kartları", () => {
  it("seçili tema işaretli ve kullan düğmesi yok; öteki temalarda var", () => {
    ciz(veri());
    expect(within(kart("Birinci")).getByText(metin("yonetim.tema.kullaniliyor"))).toBeDefined();
    expect(within(kart("Birinci")).queryByRole("button")).toBeNull();
    expect(kullanDugmesi("İkinci")).toBeDefined();
    expect(within(kart("İkinci")).queryByText(metin("yonetim.tema.kullaniliyor"))).toBeNull();
  });

  it("demo bağlantısı demonun adresine yeni sekmede gider; siteye özel temada bağlantı yok, nedeni yazar", () => {
    ciz(veri());
    const baglanti = within(kart("İkinci")).getByRole("link", {
      name: doldur(metin("yonetim.tema.demoyuGezEtiketi"), { ad: "İkinci" }),
    });
    expect(baglanti.getAttribute("href")).toBe("https://demo.ornek.test/?tema=ikinci");
    expect(baglanti.getAttribute("target")).toBe("_blank");
    expect(baglanti.getAttribute("rel")).toContain("noopener");
    expect(within(kart("Özel")).queryByRole("link")).toBeNull();
    expect(within(kart("Özel")).getByText(metin("yonetim.tema.demosuYok"))).toBeDefined();
    expect(within(kart("Özel")).getByText(metin("yonetim.tema.siteyeOzel"))).toBeDefined();
  });
});

describe("temayı kullanmak", () => {
  it("düzen yolu seçilmeden istek gitmez, hata gruba bağlanır; seçilince tema, ayarları ve yol gider", async () => {
    ciz(veri());
    fireEvent.click(kullanDugmesi("İkinci"));
    const pencere = screen.getByRole("dialog", {
      name: doldur(metin("yonetim.tema.pencere.baslik"), { ad: "İkinci" }),
    });
    const gonder = within(pencere).getByRole("button", {
      name: metin("yonetim.tema.pencere.yayinla"),
    });
    await act(async () => fireEvent.click(gonder));
    expect(istekler).toEqual([]);
    const grup = within(pencere).getByRole("radiogroup", {
      name: metin("yonetim.tema.pencere.duzen"),
    });
    expect(grup.getAttribute("aria-invalid")).toBe("true");
    expect(within(pencere).getByText(metin("yonetim.tema.pencere.secimYok"))).toBeDefined();
    fireEvent.click(within(grup).getByRole("radio", { name: metin("yonetim.tema.pencere.koru") }));
    expect(within(pencere).getByText(metin("yonetim.tema.pencere.koruAciklamasi"))).toBeDefined();
    await act(async () => fireEvent.click(gonder));
    expect(istekler).toEqual([
      {
        adres: "/kapi/yonetici/tema",
        govde: {
          tema: "ikinci",
          ayarlar: { renkler: {}, koyuTema: true, urunFiltresi: "ustte" },
          duzen: "koru",
          son: 4,
        },
      },
    ]);
    expect(yenile).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("hata pencerede kalır ve metniyle söylenir; pencere her açılışta seçimsiz başlar", async () => {
    yanit = () =>
      Response.json(
        {
          basarili: false,
          hata: { kod: "is-kurali", ayrinti: [{ alan: "tema", kod: "tema-degistirilemez" }] },
        },
        { status: 422 },
      );
    ciz(veri());
    fireEvent.click(kullanDugmesi("İkinci"));
    let pencere = screen.getByRole("dialog");
    fireEvent.click(
      within(pencere).getByRole("radio", { name: metin("yonetim.tema.pencere.uygula") }),
    );
    await act(async () =>
      fireEvent.click(
        within(pencere).getByRole("button", { name: metin("yonetim.tema.pencere.yayinla") }),
      ),
    );
    expect(within(pencere).getByText(metin("yonetim.tema.hata.degistirilemez"))).toBeDefined();
    fireEvent.click(within(pencere).getByRole("button", { name: metin("ortak.islem.vazgec") }));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(kullanDugmesi("Özel"));
    pencere = screen.getByRole("dialog");
    expect(
      within(pencere)
        .getAllByRole("radio")
        .map((radyo) => radyo.getAttribute("aria-checked")),
    ).toEqual(["false", "false"]);
    expect(within(pencere).queryByText(metin("yonetim.tema.hata.degistirilemez"))).toBeNull();
  });
});

describe("tema ayarları", () => {
  it("komut çubuğunda tema ayarlarına bağlantı var; değiştiremeyen yönetici de görür", () => {
    ciz(veri({ degistirilebilir: false }), false);
    const baglanti = screen.getByRole("link", { name: metin("yonetim.eylem.temaAyarlari") });
    expect(baglanti.getAttribute("href")).toBe("/yonetim/tema/ayarlar");
  });
});

describe("önceki hâline dön", () => {
  it("ekranın gördüğü sürümü gönderir; çift basış tek istek", async () => {
    ciz(veri());
    const dugme = screen.getByRole("button", { name: metin("yonetim.eylem.oncekiHaleDon") });
    await act(async () => {
      fireEvent.click(dugme);
      fireEvent.click(dugme);
    });
    expect(istekler).toEqual([{ adres: "/kapi/yonetici/tema-geri-don", govde: { son: 4 } }]);
  });

  it("tek sürümde düğme yok", () => {
    ciz(veri({ sira: 1 }));
    expect(screen.queryByRole("button", { name: metin("yonetim.eylem.oncekiHaleDon") })).toBeNull();
  });
});

describe("değiştiremeyen yönetici", () => {
  it.each([
    ["ayar kapalı", veri({ degistirilebilir: false }), true],
    ["izin yok", veri(), false],
  ])(
    "%s: değiştiren düğme yok, demo bağlantıları ve tema ayarlarına bağlantı var",
    (_ad, v, izinli) => {
      ciz(v, izinli);
      expect(screen.queryAllByRole("button")).toEqual([]);
      expect(screen.queryByRole("radiogroup")).toBeNull();
      // İki demo ve "Tema ayarları".
      expect(screen.getAllByRole("link")).toHaveLength(3);
      const neden = screen.queryByText(metin("yonetim.tema.kapali"));
      expect(neden === null).toBe(v.degistirilebilir);
    },
  );
});
