// @vitest-environment jsdom
// Sayfa iskeletinin ortak parçaları (kart 0135, karar 0102): sayfa yolu, sayfa başlığı, boş hâl, sayfalama.
// Tarayıcıda iki renkte ve üç genişlikte taranmaları cekirdek/testler/uctan-uca/katalog.test.ts'tedir.
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BosHal } from "../bos-hal.tsx";
import { SayfaBasligi } from "../sayfa-basligi.tsx";
import { SayfaYolu } from "../sayfa-yolu.tsx";
import { DahaFazla, Sayfalama, sayfaNumaralari } from "../sayfalama.tsx";

afterEach(cleanup);

const bagMetni = "Ana sayfa";

const metinler = {
  etiket: "Sayfalar",
  onceki: "Önceki sayfa",
  sonraki: "Sonraki sayfa",
  sayfaAdi: (sayfa: number) => `${sayfa}. sayfa`,
  bosluk: "…",
};
const adres = (sayfa: number) => `/kategori/giyim?sayfa=${sayfa}`;

describe("sayfa numaraları", () => {
  it.each([
    [1, 1, [1]],
    [1, 3, [1, 2, 3]],
    [2, 6, [1, 2, 3, "bosluk", 6]],
    [1, 12, [1, 2, "bosluk", 12]],
    [6, 12, [1, "bosluk", 5, 6, 7, "bosluk", 12]],
    [12, 12, [1, "bosluk", 11, 12]],
    // Tek sayfalık boşluk numarasıyla yazılır.
    [4, 7, [1, 2, 3, 4, 5, 6, 7]],
    [2, 5, [1, 2, 3, 4, 5]],
    [5, 9, [1, "bosluk", 4, 5, 6, "bosluk", 9]],
  ] as const)("%i / %i", (sayfa, toplam, beklenen) => {
    expect(sayfaNumaralari(sayfa, toplam)).toEqual(beklenen);
  });
});

describe("sayfalama", () => {
  it("bulunulan sayfa geçerli sayfadır; her numara adresine gider, atlananlar okunmaz", () => {
    render(<Sayfalama sayfa={6} toplamSayfa={12} adres={adres} metinler={metinler} />);
    const gezinme = screen.getByRole("navigation", { name: "Sayfalar" });
    const gecerli = within(gezinme).getByRole("link", { name: "6. sayfa" });
    expect(gecerli.getAttribute("aria-current")).toBe("page");
    expect(gecerli.getAttribute("href")).toBe(adres(6));
    expect(
      within(gezinme).getByRole("link", { name: "7. sayfa" }).getAttribute("aria-current"),
    ).toBeNull();
    expect(within(gezinme).getByRole("link", { name: "Önceki sayfa" }).getAttribute("href")).toBe(
      adres(5),
    );
    expect(within(gezinme).getByRole("link", { name: "Sonraki sayfa" }).getAttribute("href")).toBe(
      adres(7),
    );
    expect(
      within(gezinme)
        .getAllByRole("link")
        .map((bag) => bag.textContent),
    ).toEqual(["", "1", "5", "6", "7", "12", ""]);
    expect(within(gezinme).getAllByText("…")).toHaveLength(2);
    for (const nokta of within(gezinme).getAllByText("…")) {
      expect(nokta.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("ilk ve son sayfada gidilemeyen yön bağlantı değildir", () => {
    const { rerender } = render(
      <Sayfalama sayfa={1} toplamSayfa={3} adres={adres} metinler={metinler} />,
    );
    expect(screen.queryByRole("link", { name: "Önceki sayfa" })).toBeNull();
    expect(screen.getByText("Önceki sayfa").closest("[aria-disabled]")).not.toBeNull();
    rerender(<Sayfalama sayfa={3} toplamSayfa={3} adres={adres} metinler={metinler} />);
    expect(screen.queryByRole("link", { name: "Sonraki sayfa" })).toBeNull();
    expect(screen.getByRole("link", { name: "Önceki sayfa" })).toBeTruthy();
  });

  it("tek sayfalık listede çizilmez", () => {
    const { container } = render(
      <Sayfalama sayfa={1} toplamSayfa={1} adres={adres} metinler={metinler} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("daha fazla göster sonraki sayfanın bağlantısıdır, son sayfada yalnız durum yazılır", () => {
    const { rerender } = render(
      <DahaFazla
        durum="24 ürünün 8'ini gördünüz"
        adres={adres(2)}
        dugmeYazisi="Daha fazla göster"
      />,
    );
    expect(screen.getByText("24 ürünün 8'ini gördünüz")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Daha fazla göster" }).getAttribute("href")).toBe(
      adres(2),
    );
    rerender(
      <DahaFazla
        durum="24 ürünün hepsini gördünüz"
        adres={undefined}
        dugmeYazisi="Daha fazla göster"
      />,
    );
    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("sayfa yolu, başlık ve boş hâl", () => {
  it("sayfa yolunun son adımı bağlantı değildir, geçerli sayfadır", () => {
    render(
      <SayfaYolu
        etiket="Sayfa yolu"
        ayrac="/"
        adimlar={[
          { ad: "Ana sayfa", adres: "/" },
          { ad: "Giyim", adres: "/kategori/giyim" },
          { ad: "Çizgili Pantolon", adres: "/urun/cizgili-pantolon" },
        ]}
      />,
    );
    const yol = screen.getByRole("navigation", { name: "Sayfa yolu" });
    expect(
      within(yol)
        .getAllByRole("link")
        .map((bag) => bag.getAttribute("href")),
    ).toEqual(["/", "/kategori/giyim"]);
    expect(within(yol).getByText("Çizgili Pantolon").getAttribute("aria-current")).toBe("page");
    expect(within(yol).getAllByRole("listitem")).toHaveLength(3);
  });

  it("sayfa başlığı sayfanın h1'idir, ek yazı başlığın dışındadır", () => {
    render(<SayfaBasligi baslik="Giyim" ek="4 ürün" />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Giyim");
    expect(screen.getByText("4 ürün").closest("h1")).toBeNull();
    cleanup();
    render(<SayfaBasligi baslik="Giyim" duzey={2} />);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Giyim");
  });

  it("boş hâlin başlığı verilen düzeydedir, sonraki adım içinde durur", () => {
    const { rerender } = render(
      <BosHal ikon="arama" baslik="Sonuç yok" aciklama="Başka bir sözcük deneyin.">
        <a href="/">{bagMetni}</a>
      </BosHal>,
    );
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Sonuç yok");
    expect(screen.getByText("Başka bir sözcük deneyin.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ana sayfa" })).toBeTruthy();
    rerender(<BosHal ikon="arama" baslik="Sonuç yok" duzey={3} />);
    expect(screen.getByRole("heading", { level: 3 })).toBeTruthy();
  });
});
