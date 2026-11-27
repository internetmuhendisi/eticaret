// @vitest-environment jsdom
// Panelin arama kutusu (kart 0321, karar 0191): yalnız izni olan türlerin ucuna istek gider, gruplar kayıttaki sırayla
// (sipariş, ürün, müşteri) gelir; kısa metinde istek gitmez; ok tuşları gezer, Enter sonucu açar (seçim yoksa ilkini),
// Escape listeyi kapatır, liste kapalıyken Escape kutuyu kapatır (telefon); sonuç sayısı canlı bölgede duyurulur;
// sonuçsuz aramada yalnız izni olan türlerin aranabilecekleri yazılır; ürünlerde fazlası varsa "Bütün ürünlerde ara";
// hata ve istek sınırı söylenir; eski isteğin cevabı yenisini ezmez. Uçlar sahte fetch ile verilir.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PanelAramaTuru } from "../../kayitlar/panel-arama.ts";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { aramaKisayoluMu, PanelAramaKutusu } from "../arama/panel-aramasi.tsx";

const git = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: git, refresh: vi.fn() }) }));

const metin = metinOkuyucu("tr");
const etiket = metin("yonetim.arama.etiket");

type Cevap = { durum?: number; veri?: unknown; hata?: string; gecikme?: number };
let cevaplar: Record<string, (aranan: string) => Cevap>;
const istekler: string[] = [];
const satir = (baslik: string, adres: string) => ({ baslik, alt: "alt", adres });

beforeEach(() => {
  vi.useFakeTimers();
  istekler.length = 0;
  git.mockReset();
  cevaplar = {
    "panel-siparis-ara": () => ({
      veri: { satirlar: [satir("Ayşe Ş. · ORN-1", "/s/1")], dahaFazla: false },
    }),
    "panel-urun-ara": () => ({
      veri: { satirlar: [satir("Ayakkabı", "/u/1"), satir("Ayna", "/u/2")], dahaFazla: false },
    }),
    "panel-musteri-ara": () => ({
      veri: { satirlar: [satir("Ayşe Şahin", "/m/1")], dahaFazla: false },
    }),
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (adres: string) => {
      istekler.push(adres);
      const url = new URL(adres, "http://magaza.test");
      const uc = url.pathname.split("/").at(-1) ?? "";
      const cevap = cevaplar[uc]?.(url.searchParams.get("ara") ?? "") ?? {
        durum: 404,
        hata: "bulunamadi",
      };
      if (cevap.gecikme !== undefined)
        await new Promise((bitti) => setTimeout(bitti, cevap.gecikme));
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
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const ciz = (turler: readonly PanelAramaTuru[], sonra?: (geriDon: boolean) => void) =>
  render(
    <MetinSaglayici dil="tr">
      <PanelAramaKutusu turler={turler} {...(sonra === undefined ? {} : { sonra })} />
    </MetinSaglayici>,
  );

const yaz = async (kutu: HTMLElement, deger: string) => {
  fireEvent.focus(kutu);
  fireEvent.change(kutu, { target: { value: deger } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });
};
const durum = () => screen.getByRole("status").textContent;
const uclar = () => istekler.map((adres) => adres.split("?")[0]);

describe("panelin arama kutusu", () => {
  it("yalnız izni olan türlerin ucuna gider; gruplar kayıttaki sırayla; sonuç sayısı duyurulur", async () => {
    // Müşteri izni yok (görevli): müşteri ucuna istek gitmez, grubu yoktur. Sıra verilenden bağımsızdır.
    ciz(["urun", "siparis"]);
    const kutu = screen.getByRole("combobox", { name: etiket });
    await yaz(kutu, "ay");
    expect(uclar().sort()).toEqual([
      "/kapi/yonetici/panel-siparis-ara",
      "/kapi/yonetici/panel-urun-ara",
    ]);
    expect(istekler[0]).toContain("ara=ay");
    const gruplar = screen
      .getAllByRole("group")
      .map((grup) => grup.getAttribute("aria-labelledby"));
    expect(gruplar.map((kimlik) => document.getElementById(kimlik ?? "")?.textContent)).toEqual([
      metin("yonetim.arama.grup.siparis"),
      metin("yonetim.arama.grup.urun"),
    ]);
    expect(screen.getAllByRole("option").map((oge) => oge.textContent)).toEqual([
      "Ayşe Ş. · ORN-1alt",
      "Ayakkabıalt",
      "Aynaalt",
    ]);
    expect(kutu.getAttribute("aria-expanded")).toBe("true");
    expect(durum()).toBe("3 sonuç bulundu.");
  });

  it("kısa metinde istek gitmez, en az harf söylenir", async () => {
    ciz(["siparis", "urun", "musteri"]);
    const kutu = screen.getByRole("combobox", { name: etiket });
    await yaz(kutu, " a ");
    expect(istekler).toEqual([]);
    expect(durum()).toBe("Aramak için en az 2 harf yazın.");
    expect(kutu.getAttribute("aria-expanded")).toBe("false");
  });

  it("ok tuşları gezer, Enter seçili sonucu açar; seçim yoksa Enter ilk sonucu açar", async () => {
    const sonra = vi.fn();
    ciz(["siparis", "urun", "musteri"], sonra);
    const kutu = screen.getByRole("combobox", { name: etiket });
    await yaz(kutu, "ay");
    fireEvent.keyDown(kutu, { key: "ArrowDown" });
    fireEvent.keyDown(kutu, { key: "ArrowDown" });
    const etkin = kutu.getAttribute("aria-activedescendant");
    expect(document.getElementById(etkin ?? "")?.textContent).toBe("Ayakkabıalt");
    expect(document.getElementById(etkin ?? "")?.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(kutu, { key: "Enter" });
    expect(git).toHaveBeenCalledWith("/u/1");
    expect(sonra).toHaveBeenCalledWith(false);
    expect((kutu as HTMLInputElement).value).toBe("");
    await yaz(kutu, "ay");
    fireEvent.keyDown(kutu, { key: "Enter" });
    expect(git).toHaveBeenLastCalledWith("/s/1");
  });

  it("Escape önce listeyi kapatır, liste kapalıyken kutuyu kapatır (telefon)", async () => {
    const sonra = vi.fn();
    ciz(["urun"], sonra);
    const kutu = screen.getByRole("combobox", { name: etiket });
    await yaz(kutu, "ay");
    fireEvent.keyDown(kutu, { key: "Escape" });
    expect(kutu.getAttribute("aria-expanded")).toBe("false");
    expect(sonra).not.toHaveBeenCalled();
    fireEvent.keyDown(kutu, { key: "Escape" });
    expect(sonra).toHaveBeenCalledWith(true);
  });

  it("sonuçsuz aramada yalnız izni olan türlerin aranabilecekleri yazılır", async () => {
    for (const uc of Object.keys(cevaplar)) {
      cevaplar[uc] = () => ({ veri: { satirlar: [], dahaFazla: false } });
    }
    ciz(["siparis", "urun"]);
    await yaz(screen.getByRole("combobox", { name: etiket }), "zxq");
    expect(durum()).toBe('"zxq" için sonuç bulunamadı.');
    expect(screen.getByText(metin("yonetim.arama.aranan.siparis"))).toBeTruthy();
    expect(screen.getByText(metin("yonetim.arama.aranan.urun"))).toBeTruthy();
    expect(screen.queryByText(metin("yonetim.arama.aranan.musteri"))).toBeNull();
  });

  it("ürünlerde fazlası varsa son seçenek bütün ürünlerde aramadır", async () => {
    cevaplar["panel-urun-ara"] = () => ({
      veri: { satirlar: [satir("Ayna", "/u/2")], dahaFazla: true },
    });
    cevaplar["panel-siparis-ara"] = () => ({ veri: { satirlar: [], dahaFazla: true } });
    ciz(["siparis", "urun"]);
    const kutu = screen.getByRole("combobox", { name: etiket });
    await yaz(kutu, "ay na");
    const secenekler = screen.getAllByRole("option");
    expect(secenekler.map((oge) => oge.textContent)).toEqual([
      "Aynaalt",
      metin("yonetim.arama.butunUrunler"),
    ]);
    // Sonuç sayısına "Bütün ürünlerde ara" girmez.
    expect(durum()).toBe("1 sonuç bulundu.");
    fireEvent.click(secenekler[1] as HTMLElement);
    expect(git).toHaveBeenCalledWith("/yonetim/urunler?ara=ay+na");
  });

  it("alınamayan tür ve istek sınırı söylenir, ötekilerin sonuçları kalır", async () => {
    cevaplar["panel-urun-ara"] = () => ({ durum: 500, hata: "beklenmeyen" });
    cevaplar["panel-musteri-ara"] = () => ({ durum: 429, hata: "istek-siniri" });
    ciz(["siparis", "urun", "musteri"]);
    await yaz(screen.getByRole("combobox", { name: etiket }), "ay");
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(durum()).toBe(
      `1 sonuç bulundu. ${metin("yonetim.arama.hata")} ${metin("yonetim.arama.sinir")}`,
    );
  });

  it("eski isteğin cevabı yenisini ezmez", async () => {
    cevaplar["panel-urun-ara"] = (aranan) =>
      aranan === "ay"
        ? { veri: { satirlar: [satir("Eski", "/u/eski")], dahaFazla: false }, gecikme: 1000 }
        : { veri: { satirlar: [satir("Yeni", "/u/yeni")], dahaFazla: false } };
    ciz(["urun"]);
    const kutu = screen.getByRole("combobox", { name: etiket });
    await yaz(kutu, "ay");
    await yaz(kutu, "ayn");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(screen.getAllByRole("option").map((oge) => oge.textContent)).toEqual(["Yenialt"]);
  });

  it("kısayol Ctrl K ve Cmd K'dır; Alt ile ya da başka harfle değildir", () => {
    const olay = (ek: Partial<KeyboardEvent>) =>
      ({ key: "k", ctrlKey: false, metaKey: false, altKey: false, ...ek }) as KeyboardEvent;
    expect(aramaKisayoluMu(olay({ ctrlKey: true }))).toBe(true);
    expect(aramaKisayoluMu(olay({ metaKey: true, key: "K" }))).toBe(true);
    expect(aramaKisayoluMu(olay({ ctrlKey: true, altKey: true }))).toBe(false);
    expect(aramaKisayoluMu(olay({ ctrlKey: true, key: "j" }))).toBe(false);
    expect(aramaKisayoluMu(olay({}))).toBe(false);
  });
});
