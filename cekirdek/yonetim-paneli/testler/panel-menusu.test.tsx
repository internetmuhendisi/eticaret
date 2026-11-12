// @vitest-environment jsdom
// Panelin ana menüsü (kart 0141): gruplar ve adları, bulunulan sayfanın işareti (alt sayfada da), kökün yalnız
// kendi adresinde seçili olması, yan penceredeki bağlantıya basınca pencerenin kapanması.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type CizilenMenuGrubu, PanelMenusu, seciliMi } from "../panel-menusu.tsx";

const { yol } = vi.hoisted(() => ({ yol: { simdi: "/yonetim" } }));
vi.mock("next/navigation", () => ({ usePathname: () => yol.simdi }));

afterEach(cleanup);

const gruplar: CizilenMenuGrubu[] = [
  {
    kod: "",
    ad: null,
    sayfalar: [{ kod: "karsilama", adres: "/yonetim", ad: "Karşılama", ikon: "ev" }],
  },
  {
    kod: "vitrin",
    ad: "Vitrin",
    sayfalar: [
      { kod: "menuler", adres: "/yonetim/menuler", ad: "Menüler", ikon: "menu" },
      { kod: "tema", adres: "/yonetim/tema", ad: "Tema", ikon: "gorsel" },
    ],
  },
];

const secili = () =>
  screen
    .getAllByRole("link")
    .filter((bag) => bag.getAttribute("aria-current") === "page")
    .map((bag) => bag.textContent);

describe("panel menüsü", () => {
  it("seçili sayfa: kök yalnız kendi adresinde, öteki sayfa alt adreslerinde de", () => {
    expect(seciliMi("/yonetim", "/yonetim")).toBe(true);
    expect(seciliMi("/yonetim", "/yonetim/menuler")).toBe(false);
    expect(seciliMi("/yonetim/menuler", "/yonetim/menuler/oge")).toBe(true);
    expect(seciliMi("/yonetim/menuler", "/yonetim/menuler-eski")).toBe(false);
  });

  it("grup adı listeyi adlandırır, bulunulan sayfa aria-current alır", () => {
    yol.simdi = "/yonetim/menuler/oge";
    render(<PanelMenusu gruplar={gruplar} />);
    expect(screen.getByRole("list", { name: "Vitrin" }).querySelectorAll("a")).toHaveLength(2);
    expect(secili()).toEqual(["Menüler"]);
    cleanup();
    yol.simdi = "/yonetim";
    render(<PanelMenusu gruplar={gruplar} />);
    expect(secili()).toEqual(["Karşılama"]);
  });

  // Masaüstünün yan menüsü ile telefonun yan penceresi aynı anda sayfada durabilir (bağımsız kontrolün bulgusu).
  it("iki menü birlikte çizilince grup başlıklarının kimliği ayrıdır, her liste kendi başlığıyla adlanır", () => {
    render(
      <>
        <PanelMenusu gruplar={gruplar} />
        <PanelMenusu gruplar={gruplar} />
      </>,
    );
    const listeler = screen.getAllByRole("list", { name: "Vitrin" });
    expect(listeler).toHaveLength(2);
    const kimlikler = listeler.map((liste) => liste.getAttribute("aria-labelledby"));
    expect(new Set(kimlikler).size).toBe(2);
    for (const kimlik of kimlikler)
      expect(document.querySelectorAll(`[id="${kimlik}"]`)).toHaveLength(1);
  });

  it("bağlantıya basınca tıklama işlevi çağrılır", () => {
    const tiklayinca = vi.fn();
    render(<PanelMenusu gruplar={gruplar} tiklayinca={tiklayinca} />);
    fireEvent.click(screen.getByRole("link", { name: "Tema" }));
    expect(tiklayinca).toHaveBeenCalledOnce();
  });
});
