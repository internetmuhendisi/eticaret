// @vitest-environment jsdom
// Panelin bildirim zili (kart 0280, karar 0198): düğmenin adı okunmamış sayısını söyler, rozet ekran okuyucudan
// gizlidir, sayı yokken rozet yoktur; ilk çizimde istek gitmez, sayfa değişince sayı ucu sorulur. Panel açılınca
// liste istenir ve adlı dialogda çizilir; okunmamış satır ekran okuyucuya "okunmamış" der. Okunmamış satıra basınca
// önce okundu isteği gider, sonra ekran açılır; okunmuş satırda okundu isteği gitmez; Ctrl ile basınca tarayıcıya
// bırakılır. "Hepsini okundu yap" sayıyı sıfırlar, odak başlığa geçer. Boş liste ve hata hâli; ayarlar bağlantısı.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { BildirimZili } from "../bildirimler/zil.tsx";

const git = vi.fn();
let yol = "/yonetim";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: git, refresh: vi.fn() }),
  usePathname: () => yol,
}));

const metin = metinOkuyucu("tr");

type Istek = { uc: string; govde: unknown };
const istekler: Istek[] = [];
let cevaplar: Record<string, (govde: unknown) => { durum?: number; veri?: unknown; hata?: string }>;

const bildirim = (kimlik: string, baslik: string, okundu: boolean) => ({
  kimlik,
  baslik,
  alt: "Deniz Y. · 100,00 ₺",
  ikon: "paket",
  an: "2026-11-20T09:00:00.000Z",
  zaman: "5 dk. önce",
  okundu,
  adres: `/yonetim/siparisler/ayrinti?numara=${kimlik}`,
});

beforeEach(() => {
  yol = "/yonetim";
  istekler.length = 0;
  git.mockReset();
  cevaplar = {
    "panel-bildirimleri": () => ({
      veri: {
        okunmamis: 2,
        bildirimler: [
          bildirim("a", "Yeni sipariş: ORN-1", false),
          bildirim("b", "Havale bildirildi: ORN-1", false),
          bildirim("c", "Yorum onay bekliyor", true),
        ],
      },
    }),
    "panel-bildirim-sayisi": () => ({ veri: { okunmamis: 5 } }),
    "panel-bildirimi-okundu": (govde) => ({
      veri: (govde as { hepsi?: true }).hepsi
        ? { okundu: 2, okunmamis: 0 }
        : { okundu: 1, okunmamis: 1 },
    }),
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (adres: string, secenekler?: RequestInit) => {
      const uc = new URL(adres, "http://magaza.test").pathname.split("/").at(-1) ?? "";
      const govde =
        typeof secenekler?.body === "string" ? (JSON.parse(secenekler.body) as unknown) : undefined;
      istekler.push({ uc, govde });
      const cevap = cevaplar[uc]?.(govde) ?? { durum: 404, hata: "bulunamadi" };
      return Response.json(
        cevap.hata === undefined
          ? { basarili: true, veri: cevap.veri }
          : { basarili: false, hata: { kod: cevap.hata } },
        { status: cevap.durum ?? 200 },
      );
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const ciz = (ilkSayi = 2, ayarlarAdresi: string | null = "/yonetim/siparis-ayarlari#bildirim") =>
  render(
    <MetinSaglayici dil="tr">
      <BildirimZili ilkSayi={ilkSayi} saklamaGun="30" ayarlarAdresi={ayarlarAdresi} />
    </MetinSaglayici>,
  );
const bekle = () =>
  act(async () => {
    await new Promise((bitti) => setTimeout(bitti, 0));
  });
const zil = () => screen.getByRole("button", { name: /^Bildirimler/ });
const ac = async () => {
  fireEvent.click(zil());
  await bekle();
  return screen.getByRole("dialog", { name: metin("yonetim.bildirimler.panelBasligi") });
};

describe("bildirim zili", () => {
  it("düğmenin adı sayıyı söyler, rozet gizlidir; sayı yokken rozet yok; ilk çizimde istek gitmez", async () => {
    const { container, unmount } = ciz(3);
    expect(zil()).toHaveProperty("textContent", "");
    expect(screen.getByRole("button", { name: "Bildirimler, 3 okunmamış" })).toBeTruthy();
    const rozet = container.querySelector('[aria-hidden="true"]:not(svg)');
    expect(rozet?.textContent).toBe("3");
    await bekle();
    expect(istekler).toEqual([]);
    unmount();
    const sifir = ciz(0);
    expect(screen.getByRole("button", { name: "Bildirimler" })).toBeTruthy();
    expect(sifir.container.querySelector('[aria-hidden="true"]:not(svg)')).toBeNull();
  });

  it("sayfa değişince sayı ucu sorulur", async () => {
    const { rerender } = ciz(2);
    yol = "/yonetim/siparisler";
    rerender(
      <MetinSaglayici dil="tr">
        <BildirimZili ilkSayi={2} saklamaGun="30" ayarlarAdresi={null} />
      </MetinSaglayici>,
    );
    await bekle();
    expect(istekler.map((i) => i.uc)).toEqual(["panel-bildirim-sayisi"]);
    expect(screen.getByRole("button", { name: "Bildirimler, 5 okunmamış" })).toBeTruthy();
  });

  it("açılınca liste; okunmamış satır söylenir; saklama yazısı ve ayarlar bağlantısı", async () => {
    ciz();
    const panel = await ac();
    expect(istekler.map((i) => i.uc)).toEqual(["panel-bildirimleri"]);
    const baglantilar = within(panel).getAllByRole("link");
    // Zaman iki yerdedir (telefonda alt yazının altında, tablette sağda); ekranda biri görünür (jsdom CSS uygulamaz).
    const zaman = "5 dk. önce";
    expect(baglantilar.map((b) => b.textContent)).toEqual([
      `Yeni sipariş: ORN-1, okunmamışDeniz Y. · 100,00 ₺${zaman}${zaman}`,
      `Havale bildirildi: ORN-1, okunmamışDeniz Y. · 100,00 ₺${zaman}${zaman}`,
      `Yorum onay bekliyorDeniz Y. · 100,00 ₺${zaman}${zaman}`,
      "Bildirim ayarları",
    ]);
    expect(baglantilar[3]?.getAttribute("href")).toBe("/yonetim/siparis-ayarlari#bildirim");
    expect(within(panel).getByText("Okunan bildirim 30 gün sonra silinir.")).toBeTruthy();
    expect(within(panel).getAllByText("5 dk. önce")[0]?.getAttribute("datetime")).toBe(
      "2026-11-20T09:00:00.000Z",
    );
  });

  it("okunmamış satır önce okundu, sonra ekran; okunmuşta istek yok; Ctrl ile tarayıcıya bırakılır", async () => {
    ciz();
    let panel = await ac();
    fireEvent.click(within(panel).getByRole("link", { name: /Yeni sipariş/ }));
    await bekle();
    expect(istekler.slice(1)).toEqual([{ uc: "panel-bildirimi-okundu", govde: { kimlik: "a" } }]);
    expect(git).toHaveBeenCalledWith("/yonetim/siparisler/ayrinti?numara=a");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Bildirimler, 1 okunmamış" })).toBeTruthy();

    istekler.length = 0;
    git.mockReset();
    panel = await ac();
    fireEvent.click(within(panel).getByRole("link", { name: /Yorum onay bekliyor/ }));
    await bekle();
    expect(istekler.map((i) => i.uc)).toEqual(["panel-bildirimleri"]);
    expect(git).toHaveBeenCalledWith("/yonetim/siparisler/ayrinti?numara=c");

    istekler.length = 0;
    git.mockReset();
    panel = await ac();
    fireEvent.click(within(panel).getByRole("link", { name: /Havale bildirildi/ }), {
      ctrlKey: true,
    });
    await bekle();
    expect(istekler.map((i) => i.uc)).toEqual(["panel-bildirimleri"]);
    expect(git).not.toHaveBeenCalled();
  });

  it("hepsini okundu yap: sayı sıfır, düğme kalkar, odak başlıkta", async () => {
    ciz();
    const panel = await ac();
    fireEvent.click(within(panel).getByRole("button", { name: "Hepsini okundu yap" }));
    await bekle();
    await bekle();
    expect(istekler.at(-1)).toEqual({ uc: "panel-bildirimi-okundu", govde: { hepsi: true } });
    expect(within(panel).queryByRole("button", { name: "Hepsini okundu yap" })).toBeNull();
    expect(screen.getByRole("button", { name: "Bildirimler" })).toBeTruthy();
    expect(document.activeElement?.textContent).toBe(metin("yonetim.bildirimler.panelBasligi"));
    expect(within(panel).queryByText(", okunmamış")).toBeNull();
  });

  it("boş liste ve hata hâli; ayar sayfası görülmüyorsa bağlantı yok", async () => {
    cevaplar["panel-bildirimleri"] = () => ({ veri: { okunmamis: 0, bildirimler: [] } });
    const { unmount } = ciz(0, null);
    let panel = await ac();
    expect(within(panel).getByText(metin("yonetim.bildirimler.bos"))).toBeTruthy();
    expect(within(panel).queryByRole("link")).toBeNull();
    expect(within(panel).queryByRole("button", { name: "Hepsini okundu yap" })).toBeNull();
    unmount();
    cevaplar["panel-bildirimleri"] = () => ({ durum: 500, hata: "beklenmeyen" });
    ciz();
    panel = await ac();
    expect(within(panel).getByText(metin("yonetim.bildirimler.hata"))).toBeTruthy();
  });
});
