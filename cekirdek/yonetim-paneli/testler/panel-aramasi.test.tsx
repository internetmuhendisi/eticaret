// @vitest-environment jsdom
// Panelin arama kutusu (kart 0321, karar 0191): yalnız izni olan türlerin ucuna istek gider, gruplar kayıttaki sırayla
// (sipariş, ürün, müşteri) gelir; kısa metinde istek gitmez; ok tuşları gezer, Enter sonucu açar (seçim yoksa ilkini),
// Escape listeyi kapatır, liste kapalıyken Escape kutuyu kapatır (telefon); sonuç sayısı canlı bölgede duyurulur;
// sonuçsuz aramada yalnız izni olan türlerin aranabilecekleri yazılır; ürünlerde fazlası varsa "Bütün ürünlerde ara";
// hata ve istek sınırı söylenir; eski isteğin cevabı yenisini ezmez. Uçlar sahte fetch ile verilir.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PanelAramaTuru } from "../../kayitlar/panel-arama.ts";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { aramaKisayoluMu, PanelAramaKutusu, useAramaKisayolu } from "../arama/panel-aramasi.tsx";

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

function KisayolDenemesi({ etkin, ac }: { etkin: boolean; ac: () => void }) {
  const kutu = useRef<HTMLInputElement>(null);
  useAramaKisayolu(etkin, kutu, ac);
  return null;
}

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
    cevaplar["panel-siparis-ara"] = () => ({ veri: { satirlar: [], dahaFazla: false } });
    ciz(["siparis", "urun"]);
    const kutu = screen.getByRole("combobox", { name: etiket });
    await yaz(kutu, "ay na");
    const secenekler = screen.getAllByRole("option");
    expect(secenekler.map((oge) => oge.textContent)).toEqual([
      "Aynaalt",
      metin("yonetim.arama.butunUrunler"),
    ]);
    // Sonuç sayısına "Bütün ürünlerde ara" girmez; fazlası olduğu söylenir.
    expect(durum()).toBe("1 sonuç gösteriliyor, daha fazlası var.");
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
      `1 sonuç bulundu. ${metin("yonetim.arama.hata").replace("{grup}", metin("yonetim.arama.grup.urun"))} ${metin("yonetim.arama.sinir")}`,
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

  it("bekleme sürerken Enter eski sonucu açmaz; yeni sonuçlar gelince ilkini açar (barkod okuyucu)", async () => {
    cevaplar["panel-siparis-ara"] = () => ({ veri: { satirlar: [], dahaFazla: false } });
    cevaplar["panel-urun-ara"] = (aranan) => ({
      veri: { satirlar: [satir(`Ürün ${aranan}`, `/u/${aranan}`)], dahaFazla: false },
    });
    ciz(["siparis", "urun"]);
    const kutu = screen.getByRole("combobox", { name: etiket });
    await yaz(kutu, "ay");
    // Yazı değişti, bekleme dolmadı: Enter eski "ay" sonucunu açmaz.
    fireEvent.change(kutu, { target: { value: "ayna" } });
    fireEvent.keyDown(kutu, { key: "Enter" });
    expect(git).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(git).toHaveBeenCalledWith("/u/ayna");
    // Boş kutuya hızla yazılıp Enter'a basılır: liste hiç açılmadan sonuç gelince açılır.
    git.mockReset();
    fireEvent.change(kutu, { target: { value: "8690000000017" } });
    fireEvent.keyDown(kutu, { key: "Enter" });
    expect(git).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(git).toHaveBeenCalledWith("/u/8690000000017");
    // Enter'dan sonra yazı değişirse eski metnin sonucu açılmaz.
    git.mockReset();
    fireEvent.change(kutu, { target: { value: "kup" } });
    fireEvent.keyDown(kutu, { key: "Enter" });
    fireEvent.change(kutu, { target: { value: "kupa" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(git).not.toHaveBeenCalled();
  });

  it("seçim yokken yukarı ok son sonuca gider", async () => {
    ciz(["siparis", "urun", "musteri"]);
    const kutu = screen.getByRole("combobox", { name: etiket });
    await yaz(kutu, "ay");
    fireEvent.keyDown(kutu, { key: "ArrowUp" });
    const etkin = kutu.getAttribute("aria-activedescendant");
    expect(document.getElementById(etkin ?? "")?.textContent).toBe("Ayşe Şahinalt");
  });

  it("sipariş ve müşteride fazlası söylenir, duyuruda da", async () => {
    cevaplar["panel-musteri-ara"] = () => ({
      veri: { satirlar: [satir("Ayşe Şahin", "/m/1")], dahaFazla: true },
    });
    ciz(["siparis", "musteri"]);
    await yaz(screen.getByRole("combobox", { name: etiket }), "ay");
    expect(screen.getByText(metin("yonetim.arama.dahaFazla"))).toBeTruthy();
    expect(durum()).toBe("2 sonuç gösteriliyor, daha fazlası var.");
  });

  it("aynı hata bir kez söylenir; alınamayan tür adıyla söylenir", async () => {
    for (const uc of Object.keys(cevaplar))
      cevaplar[uc] = () => ({ durum: 429, hata: "istek-siniri" });
    ciz(["siparis", "urun", "musteri"]);
    const kutu = screen.getByRole("combobox", { name: etiket });
    await yaz(kutu, "ay");
    expect(durum()).toBe(metin("yonetim.arama.sinir"));
    cevaplar["panel-urun-ara"] = () => ({ durum: 500, hata: "beklenmeyen" });
    await yaz(kutu, "ayn");
    expect(durum()).toContain(
      metin("yonetim.arama.hata").replace("{grup}", metin("yonetim.arama.grup.urun")),
    );
  });

  it("panelin içine basmak kutunun odağını almaz", async () => {
    ciz(["urun"]);
    const kutu = screen.getByRole("combobox", { name: etiket });
    await yaz(kutu, "ay");
    const baslik = screen.getByText(metin("yonetim.arama.grup.urun"));
    // preventDefault edilen olayda fireEvent false döner.
    expect(fireEvent.mouseDown(baslik)).toBe(false);
  });

  it("kısayolun işareti ve açıklaması yalnız istenince (masaüstünün şeridi)", () => {
    const { unmount } = ciz(["urun"]);
    expect(screen.queryByText(metin("yonetim.arama.kisayol"))).toBeNull();
    unmount();
    render(
      <MetinSaglayici dil="tr">
        <PanelAramaKutusu turler={["urun"]} kisayolGoster />
      </MetinSaglayici>,
    );
    expect(screen.getByText(metin("yonetim.arama.kisayol"))).toBeTruthy();
    expect(
      screen.getByRole("combobox", { name: etiket }).getAttribute("aria-describedby"),
    ).toBeTruthy();
  });

  it("kısayol Ctrl K'dır, Mac'te Cmd K; Alt, Shift ya da başka harfle değildir", () => {
    const olay = (ek: Partial<KeyboardEvent>) =>
      ({
        key: "k",
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        shiftKey: false,
        ...ek,
      }) as KeyboardEvent;
    expect(aramaKisayoluMu(olay({ ctrlKey: true }), false)).toBe(true);
    expect(aramaKisayoluMu(olay({ metaKey: true }), false)).toBe(false);
    // Mac'te Ctrl K metin alanının kendi kısayoludur.
    expect(aramaKisayoluMu(olay({ ctrlKey: true }), true)).toBe(false);
    expect(aramaKisayoluMu(olay({ metaKey: true, key: "K" }), true)).toBe(true);
    expect(aramaKisayoluMu(olay({ ctrlKey: true, altKey: true }), false)).toBe(false);
    expect(aramaKisayoluMu(olay({ ctrlKey: true, shiftKey: true }), false)).toBe(false);
    expect(aramaKisayoluMu(olay({ ctrlKey: true, key: "j" }), false)).toBe(false);
  });

  it("çerçevenin kısayolu: şerit görünmüyorsa telefonun kipini açar; başkasının işlediği tuşu yok sayar; izinsizde dinlemez", () => {
    const telefondaAc = vi.fn();
    const { rerender } = render(<KisayolDenemesi etkin ac={telefondaAc} />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(telefondaAc).toHaveBeenCalledTimes(1);
    const islenmis = new KeyboardEvent("keydown", { key: "k", ctrlKey: true, cancelable: true });
    islenmis.preventDefault();
    document.dispatchEvent(islenmis);
    expect(telefondaAc).toHaveBeenCalledTimes(1);
    rerender(<KisayolDenemesi etkin={false} ac={telefondaAc} />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(telefondaAc).toHaveBeenCalledTimes(1);
  });
});
