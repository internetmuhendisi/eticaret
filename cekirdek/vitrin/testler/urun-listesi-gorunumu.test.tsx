// @vitest-environment jsdom
// Filtreli ürün listesinin görünüşü (kart 0136, karar 0102): filtrenin yeri temanın seçimidir (solda sütun ya da
// üstte şerit), sayfa geçişi ayardır (numaralı ya da "daha fazla göster"), seçili filtreler kaldırılabilir
// bağlantılardır (fiyat sitenin para biçimiyle), "Tümünü temizle" sıralamayı korur; kapsam boşsa ve filtreye uyan
// yoksa ayrı boş hâller; bozuk tutar alanın altında hata; üstteki şeritte grup düğmesi paneli açar, seçim adresi
// değiştirir; telefondaki düğme seçili filtre sayısını söyler.
import { resolve } from "node:path";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { siteninBicimleyicisi } from "../../metinler/site-metni.ts";
import { doldur } from "../../moduller/eposta/sablon.ts";
import { adrestenDurum } from "../urun-listesi/adres.ts";
import { UrunListesiGorunumu, type UrunListesiVerisi } from "../urun-listesi/sayfa.tsx";

const git = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: git }) }));

const metin = metinOkuyucu("tr");
const site = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler/gecerli"),
);
beforeAll(() => {
  (globalThis as Record<symbol, unknown>)[Symbol.for("cekirdek.calisanSite")] = site;
});
afterEach(() => {
  cleanup();
  git.mockReset();
});

const yol = "/kategori/giyim";

const veri = (
  ek: Partial<UrunListesiVerisi> = {},
  adres: Record<string, string> = {},
): UrunListesiVerisi => ({
  liste: {
    urunler: ["a"],
    toplam: 30,
    kapsamToplami: 40,
    sayfa: 1,
    toplamSayfa: 2,
    secenekler: {
      markalar: [{ anahtar: "orn", ad: "Örnek", adet: 3, secili: false }],
      secenekler: [
        {
          anahtar: "beden",
          ad: "Beden",
          secenekler: [
            { anahtar: "m", ad: "M", adet: 2, secili: false },
            { anahtar: "xl", ad: "XL", adet: 0, secili: false },
          ],
        },
      ],
      ozellikler: [],
      stoktakiler: { adet: 25, secili: false },
    },
  },
  kartlar: [],
  durum: adrestenDurum(adres),
  siralama: "onerilen",
  varsayilanSiralama: "onerilen",
  birikimli: false,
  boyut: 24,
  filtreYeri: "solda",
  kartGorunumu: "dikey",
  fiyat: {},
  markaGrubu: true,
  ...ek,
});

const ciz = (v: UrunListesiVerisi) =>
  render(
    <MetinSaglayici dil="tr">
      <UrunListesiGorunumu veri={v} yol={yol} />
    </MetinSaglayici>,
  );

describe("filtrenin yeri", () => {
  it("solda: sütun var, üst şerit yok", () => {
    ciz(veri());
    expect(screen.queryAllByRole("button", { expanded: false, name: "Beden" })).toHaveLength(0);
    expect(screen.getByRole("heading", { name: "Beden" })).toBeTruthy();
  });

  it("üstte: grup düğmesi paneli açar, sıfır sayılı seçenek seçilemez, seçim adresi değiştirir", () => {
    ciz(veri({ filtreYeri: "ustte" }));
    const dugme = screen.getByRole("button", { name: "Beden" });
    expect(dugme.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(dugme);
    expect(dugme.getAttribute("aria-expanded")).toBe("true");
    const panel = screen.getByRole("group", { name: "Beden" });
    const xl = within(panel).getByRole("checkbox", { name: "XL (0)" });
    expect(xl.hasAttribute("disabled")).toBe(true);
    fireEvent.click(within(panel).getByRole("checkbox", { name: "M (2)" }));
    expect(git).toHaveBeenCalledWith(`${yol}?secenek-beden=m`, { scroll: false });
  });
});

describe("sayfa geçişi", () => {
  it("numaralı: sayfa bağlantıları filtreyi ve sıralamayı korur", () => {
    ciz(veri({}, { marka: "orn", sirala: "en-yeni" }));
    const sayfalar = screen.getByRole("navigation", { name: metin("ortak.parca.sayfalar") });
    expect(
      within(sayfalar)
        .getByRole("link", { name: metin("ortak.parca.sonrakiSayfa") })
        .getAttribute("href"),
    ).toBe(`${yol}?marka=orn&sirala=en-yeni&sayfa=2`);
  });

  it("daha fazla göster: sonraki sayfanın adresi, son sayfada düğme yok", () => {
    ciz(veri({ birikimli: true }));
    expect(
      screen.getByRole("link", { name: metin("vitrin.liste.dahaFazla") }).getAttribute("href"),
    ).toBe(`${yol}?sayfa=2`);
    cleanup();
    ciz(veri({ birikimli: true, liste: { ...veri().liste, sayfa: 2 } }));
    expect(screen.queryByRole("link", { name: metin("vitrin.liste.dahaFazla") })).toBeNull();
  });
});

describe("seçili filtreler", () => {
  it("fiyat sitenin para biçimiyle; kaldırma bağlantısı yalnız o filtreyi kaldırır; temizle sıralamayı korur", () => {
    const v = veri(
      {
        fiyat: { enAz: 100_000 },
        liste: {
          ...veri().liste,
          secenekler: {
            ...veri().liste.secenekler,
            markalar: [{ anahtar: "orn", ad: "Örnek", adet: 3, secili: true }],
          },
        },
      },
      { "en-az": "1.000", marka: "orn", sirala: "en-yeni" },
    );
    ciz(v);
    const secili = screen.getByRole("list", { name: metin("vitrin.liste.seciliFiltreler") });
    const tutar = siteninBicimleyicisi(site.ayarlar).para(100_000);
    const fiyat = within(secili).getByRole("link", {
      name: new RegExp(
        doldur(metin("vitrin.liste.seciliFiyatEnAz"), { tutar }).replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        ),
      ),
    });
    expect(fiyat.getAttribute("href")).toBe(`${yol}?marka=orn&sirala=en-yeni`);
    expect(within(secili).getByRole("link", { name: /Örnek/ }).getAttribute("href")).toBe(
      `${yol}?en-az=1.000&sirala=en-yeni`,
    );
    expect(
      within(secili)
        .getByRole("link", { name: metin("vitrin.liste.tumunuTemizle") })
        .getAttribute("href"),
    ).toBe(`${yol}?sirala=en-yeni`);
    // Telefondaki düğme seçili filtre sayısını söyler.
    expect(
      screen.getByRole("button", {
        name: doldur(metin("vitrin.liste.filtreleSayili"), { sayi: "2" }),
      }),
    ).toBeTruthy();
  });

  it("bozuk tutar: yalnız o alan hatalı işaretlenir, açıklaması hatadır; okunan öteki alanın etiketi kalır", () => {
    ciz(
      veri(
        { fiyatHatasi: { enAz: true, enCok: false }, fiyat: { enCok: 50_000 } },
        { "en-az": "1.5", "en-cok": "500" },
      ),
    );
    const alan = screen.getByRole("textbox", { name: metin("vitrin.liste.enAz") });
    expect(alan.getAttribute("aria-invalid")).toBe("true");
    const aciklama = document.getElementById(alan.getAttribute("aria-describedby") ?? "");
    expect(aciklama?.textContent).toContain("Tutar okunamadı");
    expect(aciklama?.parentElement?.getAttribute("aria-live")).toBe("polite");
    expect(
      screen
        .getByRole("textbox", { name: metin("vitrin.liste.enCok") })
        .getAttribute("aria-invalid"),
    ).toBeNull();
    const secili = screen.getByRole("list", { name: metin("vitrin.liste.seciliFiltreler") });
    expect(within(secili).getAllByRole("link")).toHaveLength(2);
  });

  it("fiyat alanları adresle eşit kalır: adres değişince yazılan eski değer gider", () => {
    const { rerender } = ciz(veri({ fiyat: { enAz: 100_000 } }, { "en-az": "1.000" }));
    const alan = () => screen.getByRole("textbox", { name: metin("vitrin.liste.enAz") });
    expect((alan() as HTMLInputElement).value).toBe("1.000");
    rerender(
      <MetinSaglayici dil="tr">
        <UrunListesiGorunumu veri={veri()} yol={yol} />
      </MetinSaglayici>,
    );
    expect((alan() as HTMLInputElement).value).toBe("");
  });

  it("fiyat Enter ile uygulanır: yazıldığı gibi adrese girer, sayfa başa döner", () => {
    ciz(veri({}, { sayfa: "3" }));
    const alan = screen.getByRole("textbox", { name: metin("vitrin.liste.enCok") });
    fireEvent.change(alan, { target: { value: "1.000,50" } });
    fireEvent.keyDown(alan, { key: "Enter" });
    expect(git).toHaveBeenCalledWith(`${yol}?en-cok=1.000%2C50`, { scroll: false });
  });
});

describe("boş hâller", () => {
  it("kapsamda ürün yok: filtresiz boş hâl", () => {
    ciz(veri({ liste: { ...veri().liste, urunler: [], toplam: 0, kapsamToplami: 0 } }));
    expect(
      screen.getByRole("heading", { name: metin("vitrin.liste.bosKapsamBaslik") }),
    ).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Beden" })).toBeNull();
  });

  it("filtreye uyan yok: filtreler yerinde, temizle bağlantısı sıralamayı korur", () => {
    const bos = veri().liste;
    ciz(
      veri(
        {
          liste: {
            ...bos,
            urunler: [],
            toplam: 0,
            secenekler: {
              ...bos.secenekler,
              markalar: [{ anahtar: "orn", ad: "Örnek", adet: 0, secili: true }],
            },
          },
        },
        { marka: "orn", sirala: "en-yeni" },
      ),
    );
    expect(
      screen.getByRole("heading", { name: metin("vitrin.liste.bosFiltreBaslik") }),
    ).toBeTruthy();
    const temizle = screen.getAllByRole("link", { name: metin("vitrin.liste.tumunuTemizle") });
    expect(temizle.map((b) => b.getAttribute("href"))).toEqual([
      `${yol}?sirala=en-yeni`,
      `${yol}?sirala=en-yeni`,
    ]);
  });
});

describe("marka sayfası", () => {
  it("marka grubu yoktur", () => {
    ciz(veri({ markaGrubu: false }));
    expect(screen.queryByRole("heading", { name: metin("vitrin.liste.marka") })).toBeNull();
  });
});
