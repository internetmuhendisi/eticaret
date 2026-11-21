// @vitest-environment jsdom
// Panelin ortak liste parçası (kart 0258), siparişler listesiyle: satır seçimi (tek tek, sayfanın hepsi, kısmen),
// toplu işlem çubuğu, onay, sonuç (işlenen sayısı, işlenemeyenlerin nedeni, odak), izni olmayana seçim yok; boş,
// sonuçsuz ve hata hâlleri; adreste olmayan arama uca gider; sıralanabilir sütun ve sekmeler. Uç sahte fetch ile
// verilir, yönlendirici taklittir.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { type ListeDurumu, type ListeVerisi, listeDurumunuOku } from "../liste/tanim.ts";
import { SiparisListesi } from "../siparisler/liste.tsx";
import { siparisListesiTanimi } from "../siparisler/liste-tanimi.ts";
import type { SiparisSatiri } from "../siparisler/veri.ts";

const yenile = vi.fn();
const git = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: yenile, push: git }),
}));

const metin = metinOkuyucu("tr");

const satir = (numara: string, ek: Partial<SiparisSatiri> = {}): SiparisSatiri => ({
  numara,
  zaman: "20.11.2026 10.00",
  musteri: "Deniz Y.",
  uye: true,
  durum: "odeme-bekleniyor",
  odeme: { yontem: "kapida-odeme", secenek: "nakit" },
  tutar: "100,00",
  havaleBildirildi: false,
  iadeTalebi: false,
  ...ek,
});

const veri = (satirlar: SiparisSatiri[], ek: Partial<ListeVerisi<SiparisSatiri>> = {}) => ({
  satirlar,
  toplam: satirlar.length,
  sayfa: 1,
  sayfaSayisi: 1,
  sayfaBoyu: 25,
  sekmeSayilari: { "": satirlar.length, "odeme-bekleniyor": satirlar.length, kargoda: 0 },
  ...ek,
});

const istekler: { adres: string; govde: unknown }[] = [];
let yanit: (adres: string) => Response;
beforeEach(() => {
  istekler.length = 0;
  yenile.mockReset();
  git.mockReset();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (adres: string, secenek?: RequestInit) => {
      istekler.push({
        adres,
        govde: secenek?.body === undefined ? undefined : JSON.parse(String(secenek.body)),
      });
      return yanit(adres);
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const ciz = (
  v: ListeVerisi<SiparisSatiri> | null,
  {
    durum = listeDurumunuOku(siparisListesiTanimi, {}),
    topluIslemler = ["hazirlamaya-al"],
  }: { durum?: ListeDurumu; topluIslemler?: string[] } = {},
) =>
  render(
    <MetinSaglayici dil="tr">
      <SiparisListesi durum={durum} veri={v} topluIslemler={topluIslemler} />
    </MetinSaglayici>,
  );

// Masaüstündeki tablo (telefondaki liste de aynı satırları taşır).
const tablo = () => within(screen.getByRole("table"));
const kutu = (ad: string) => tablo().getByRole("checkbox", { name: ad });

describe("seçim ve toplu işlem", () => {
  it("satırlar tek tek ve sayfanın hepsi seçilir, kısmen hâli, çubuk ve seçim sayısı", () => {
    ciz(veri([satir("S-1"), satir("S-2"), satir("S-3")]));
    const hepsi = kutu(metin("yonetim.liste.sayfayiSec"));
    expect(hepsi.getAttribute("aria-checked")).toBe("false");
    expect(screen.queryByRole("region", { name: metin("yonetim.liste.topluIslem") })).toBeNull();

    fireEvent.click(kutu("Seç: S-2"));
    expect(hepsi.getAttribute("aria-checked")).toBe("mixed");
    const cubuk = screen.getByRole("region", { name: metin("yonetim.liste.topluIslem") });
    expect(within(cubuk).getByText("1 seçili")).toBeDefined();
    // Telefondaki kart da aynı seçimi gösterir.
    const telefon = within(screen.getByRole("list", { name: metin("yonetim.siparisler.liste") }));
    expect(telefon.getByRole("checkbox", { name: "Seç: S-2" }).getAttribute("aria-checked")).toBe(
      "true",
    );

    fireEvent.click(hepsi);
    // Kısmen seçiliyken başlık kutusu seçimi bırakır.
    expect(hepsi.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(hepsi);
    expect(hepsi.getAttribute("aria-checked")).toBe("true");
    expect(within(screen.getByRole("region")).getByText("3 seçili")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: metin("yonetim.liste.secimiKaldir") }));
    expect(hepsi.getAttribute("aria-checked")).toBe("false");
  });

  it("izni olan toplu işlem yoksa seçim kutusu yoktur", () => {
    ciz(veri([satir("S-1")]), { topluIslemler: [] });
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("işlem önce sorulur, yalnız seçilenler ekranın gördüğü durumla gider, sonuç yazılır ve odak sonuca geçer", async () => {
    yanit = () =>
      Response.json({
        basarili: true,
        veri: { islenen: ["S-1"], islenemeyen: [{ anahtar: "S-3", kod: "yontem-uymuyor" }] },
      });
    ciz(
      veri([
        satir("S-1"),
        satir("S-2"),
        satir("S-3", { odeme: { yontem: "havale", secenek: null } }),
      ]),
    );
    fireEvent.click(kutu("Seç: S-1"));
    fireEvent.click(kutu("Seç: S-3"));
    fireEvent.click(screen.getByRole("button", { name: metin("yonetim.eylem.hazirlamayaAl") }));
    const pencere = screen.getByRole("alertdialog");
    expect(within(pencere).getByText("2 sipariş hazırlamaya alınsın mı?")).toBeDefined();
    expect(istekler).toHaveLength(0);
    await act(async () => {
      fireEvent.click(
        within(pencere).getByRole("button", { name: metin("yonetim.eylem.hazirlamayaAl") }),
      );
    });
    expect(istekler).toEqual([
      {
        adres: "/kapi/yonetici/siparisler-toplu",
        govde: {
          islem: "hazirlamaya-al",
          siparisler: [
            { numara: "S-1", gorulenDurum: "odeme-bekleniyor" },
            { numara: "S-3", gorulenDurum: "odeme-bekleniyor" },
          ],
        },
      },
    ]);
    expect(yenile).toHaveBeenCalled();
    expect(screen.getByText("1 sipariş hazırlamaya alındı.")).toBeDefined();
    expect(screen.getByText("1 kayıt işlenemedi:")).toBeDefined();
    const neden = screen.getByText(
      `S-3: ${metin("yonetim.siparisler.toplu.neden.yontem-uymuyor")}`,
    );
    // Odak sonucun kutusundadır (sayfanın gövdesi değil).
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement?.contains(neden)).toBe(true);
    // Seçim bırakıldı, çubuk kalktı.
    expect(screen.queryByRole("region", { name: metin("yonetim.liste.topluIslem") })).toBeNull();
  });

  it("vazgeçilirse istek gitmez; istek reddedilirse nedeni yazar", async () => {
    yanit = () => Response.json({ basarili: false, hata: { kod: "yetki" } }, { status: 403 });
    ciz(veri([satir("S-1")]));
    fireEvent.click(kutu("Seç: S-1"));
    fireEvent.click(screen.getByRole("button", { name: metin("yonetim.eylem.hazirlamayaAl") }));
    fireEvent.click(screen.getByRole("button", { name: metin("ortak.islem.vazgec") }));
    expect(istekler).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: metin("yonetim.eylem.hazirlamayaAl") }));
    await act(async () => {
      fireEvent.click(
        within(screen.getByRole("alertdialog")).getByRole("button", {
          name: metin("yonetim.eylem.hazirlamayaAl"),
        }),
      );
    });
    expect(screen.getByText(metin("yonetim.liste.sonuc.yetki"))).toBeDefined();
  });
});

describe("hâller", () => {
  it("hiç kayıt yokken boş hâl; arama ve süzgeç gösterilmez", () => {
    ciz(veri([]));
    expect(screen.getByText(metin("yonetim.siparisler.bos.baslik"))).toBeDefined();
    expect(screen.queryByRole("search")).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("süzgeçle eşleşen yokken sonuçsuz hâl ve süzgeçleri temizleme bağlantısı", () => {
    ciz(veri([]), { durum: listeDurumunuOku(siparisListesiTanimi, { odeme: "kart" }) });
    expect(screen.getByText(metin("yonetim.liste.sonucsuz.baslik"))).toBeDefined();
    const bag = screen
      .getAllByRole("link", { name: metin("yonetim.liste.suzgecleriTemizle") })
      .map((oge) => oge.getAttribute("href"));
    expect(bag).toContain("/yonetim/siparisler");
    // Seçili süzgeç şeritte kaldırılabilir.
    expect(
      screen.getByRole("link", { name: "Süzgeci kaldır: Ödeme yöntemi: Kartla öde" }),
    ).toBeDefined();
  });

  it("okunamayan liste hata hâlini gösterir, Yeniden dene sayfayı yeniden okur", () => {
    ciz(null);
    expect(screen.getByText(metin("yonetim.liste.hata.baslik"))).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: metin("yonetim.liste.hata.yenidenDene") }));
    expect(yenile).toHaveBeenCalled();
  });
});

describe("arama, sıralama ve sekmeler", () => {
  it("sipariş araması adrese yazılmaz: uca gider, sonuç aynı tabloda ve duyurulur", async () => {
    yanit = () =>
      Response.json({ basarili: true, veri: veri([satir("S-9", { musteri: "Ayşe Y." })]) });
    ciz(veri([satir("S-1"), satir("S-2")]), {
      durum: listeDurumunuOku(siparisListesiTanimi, { odeme: "kapida-odeme" }),
    });
    fireEvent.change(screen.getByRole("searchbox", { name: metin("yonetim.siparisler.ara") }), {
      target: { value: " ayşe " },
    });
    await act(async () => {
      fireEvent.submit(screen.getByRole("search"));
    });
    expect(istekler.map((istek) => istek.adres)).toEqual([
      "/kapi/yonetici/siparisler?odeme=kapida-odeme&ara=ay%C5%9Fe",
    ]);
    expect(git).not.toHaveBeenCalled();
    expect(tablo().getByText("S-9")).toBeDefined();
    expect(tablo().queryByText("S-1")).toBeNull();
    expect(screen.getByText('"ayşe" için 1 kayıt bulundu.')).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: metin("yonetim.liste.aramayiTemizle") }));
    expect(tablo().getByText("S-1")).toBeDefined();
  });

  it("sıralanabilir sütun yönünü söyler ve öteki yöne bağlanır; sayısı olmayan sekme görünmez", () => {
    ciz(veri([satir("S-1")]));
    const tarih = screen.getByRole("columnheader", { name: /Tarih/ });
    expect(tarih.getAttribute("aria-sort")).toBe("descending");
    expect(within(tarih).getByRole("link").getAttribute("href")).toBe(
      "/yonetim/siparisler?sirala=en-eski",
    );
    expect(
      screen.getByRole("columnheader", { name: /Tutar/ }).getAttribute("aria-sort"),
    ).toBeNull();
    const sekmeler = within(
      screen.getByRole("navigation", { name: metin("yonetim.siparisler.durumSuzgeci") }),
    );
    expect(sekmeler.getByRole("link", { name: /Tümü/ }).getAttribute("aria-current")).toBe("page");
    expect(sekmeler.getByRole("link", { name: /Ödeme bekleniyor/ })).toBeDefined();
    expect(sekmeler.queryByRole("link", { name: /Kargoda/ })).toBeNull();
  });
});
