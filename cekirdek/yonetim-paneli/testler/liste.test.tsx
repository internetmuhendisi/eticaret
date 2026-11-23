// @vitest-environment jsdom
// Panelin ortak liste parçası (kart 0258), siparişler listesiyle: satır seçimi (tek tek, sayfanın hepsi, kısmen),
// tarih süzgecinin paneli, değer süzgecinin şeridi ve bakılması gereken sekmesi (kart 0267),
// toplu işlem çubuğu, onay, sonuç (işlenen sayısı, işlenemeyenlerin nedeni, odak), izni olmayana seçim yok; boş,
// sonuçsuz ve hata hâlleri; adreste olmayan arama uca gider; sıralanabilir sütun ve sekmeler. Uç sahte fetch ile
// verilir, yönlendirici taklittir.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StokBildirimleriListesi } from "../../eklentiler/stoga-gelince-haber-ver/panel/liste.tsx";
import { stokBildirimleriListesiTanimi } from "../../eklentiler/stoga-gelince-haber-ver/panel/liste-tanimi.ts";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { type ListeDurumu, type ListeVerisi, listeDurumunuOku } from "../liste/tanim.ts";
import { SiparisListesi } from "../siparisler/liste.tsx";
import { siparisListesiTanimi } from "../siparisler/liste-tanimi.ts";
import type { SiparisSatiri } from "../siparisler/veri.ts";

// Radix'in açılır paneli ve radyo grubu boyutu ResizeObserver ile izler; jsdom'da yoktur.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

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
  iadeBekliyor: false,
  talepOnaylandi: false,
  iadeBasarisiz: false,
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
    kargo = ["Aras", "Hızlı, Kargo"],
    gunYazilari = {},
  }: {
    durum?: ListeDurumu;
    topluIslemler?: string[];
    kargo?: string[];
    gunYazilari?: Record<string, string>;
  } = {},
) =>
  render(
    <MetinSaglayici dil="tr">
      <SiparisListesi
        durum={durum}
        veri={v}
        topluIslemler={topluIslemler}
        kayitSecenekleri={{ kargo: kargo.map((ad) => ({ deger: ad, ad })) }}
        gunYazilari={gunYazilari}
      />
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

describe("bağımsız kontrolün bulguları", () => {
  it("aynı aranan metin yeniden gönderilince yeniden sorulur, liste yükleniyorda kalmaz", async () => {
    yanit = () => Response.json({ basarili: true, veri: veri([satir("S-9")]) });
    ciz(veri([satir("S-1")]));
    const kutu = screen.getByRole("searchbox", { name: metin("yonetim.siparisler.ara") });
    fireEvent.change(kutu, { target: { value: "ali" } });
    await act(async () => {
      fireEvent.submit(screen.getByRole("search"));
    });
    await act(async () => {
      fireEvent.submit(screen.getByRole("search"));
    });
    expect(istekler).toHaveLength(2);
    expect(tablo().getByText("S-9")).toBeDefined();
    expect(screen.getByRole("table").querySelector("[aria-busy]")).toBeNull();
  });

  it("sayfa, süzgeç ya da sıralama değişince seçim bırakılır", () => {
    const { rerender } = ciz(veri([satir("S-1"), satir("S-2")]));
    fireEvent.click(kutu("Seç: S-1"));
    expect(screen.getByRole("region", { name: metin("yonetim.liste.topluIslem") })).toBeDefined();
    rerender(
      <MetinSaglayici dil="tr">
        <SiparisListesi
          durum={listeDurumunuOku(siparisListesiTanimi, { sirala: "en-eski" })}
          veri={veri([satir("S-1"), satir("S-2")])}
          topluIslemler={["hazirlamaya-al"]}
          kayitSecenekleri={{}}
          gunYazilari={{}}
        />
      </MetinSaglayici>,
    );
    expect(kutu("Seç: S-1").getAttribute("aria-checked")).toBe("false");
    expect(screen.queryByRole("region", { name: metin("yonetim.liste.topluIslem") })).toBeNull();
  });

  it("telefonda da sayfanın hepsini seçen kutu var", () => {
    ciz(veri([satir("S-1"), satir("S-2")]));
    const hepsi = screen
      .getAllByRole("checkbox", { name: metin("yonetim.liste.sayfayiSec") })
      .find((oge) => screen.getByRole("table").contains(oge) === false);
    if (hepsi === undefined) throw new Error("Telefondaki kutu yok.");
    fireEvent.click(hepsi);
    const telefon = within(screen.getByRole("list", { name: metin("yonetim.siparisler.liste") }));
    expect(telefon.getByRole("checkbox", { name: "Seç: S-2" }).getAttribute("aria-checked")).toBe(
      "true",
    );
  });

  it("adresteki aramada kutu ve temizleme düğmesi adresi izler (geri, ileri, temizle)", () => {
    const stokCiz = (ara: string) => (
      <MetinSaglayici dil="tr">
        <StokBildirimleriListesi
          durum={listeDurumunuOku(stokBildirimleriListesiTanimi, ara === "" ? {} : { ara })}
          veri={{
            satirlar: [
              {
                birim: "b1",
                urunAdi: "Kupa",
                adres: "/urun/kupa",
                secim: [],
                bekleyen: "2",
                enEski: "1 Kasım",
              },
            ],
            toplam: 1,
            sayfa: 1,
            sayfaSayisi: 1,
            sayfaBoyu: 200,
            sekmeSayilari: {},
          }}
          sinirda={false}
          sinir="200"
        />
      </MetinSaglayici>
    );
    const { rerender } = render(stokCiz("kupa"));
    const kutu = () =>
      screen.getByRole("searchbox", { name: metin("eklenti.stokBildirimi.panel.ara") });
    expect((kutu() as HTMLInputElement).value).toBe("kupa");
    expect(
      screen.getByRole("button", { name: metin("yonetim.liste.aramayiTemizle") }),
    ).toBeDefined();
    rerender(stokCiz(""));
    expect((kutu() as HTMLInputElement).value).toBe("");
    expect(
      screen.queryByRole("button", { name: metin("yonetim.liste.aramayiTemizle") }),
    ).toBeNull();
    rerender(stokCiz("termos"));
    expect((kutu() as HTMLInputElement).value).toBe("termos");
  });
});

describe("tarih ve kargo süzgeçleri, bakılması gereken (kart 0267)", () => {
  const tarihDugmesi = () =>
    screen.getByRole("button", {
      name: new RegExp(`^${metin("yonetim.siparisler.tarihSuzgeci")}`),
    });
  const panel = () =>
    within(screen.getByRole("dialog", { name: metin("yonetim.siparisler.tarihSuzgeci") }));
  const ac = async () => {
    await act(async () => {
      fireEvent.click(tarihDugmesi());
    });
  };
  const uygula = async () => {
    await act(async () => {
      fireEvent.click(panel().getByRole("button", { name: metin("yonetim.liste.tarih.uygula") }));
    });
  };

  it("hazır aralık seçilip uygulanınca adrese yazılır, panel kapanır; Temizle süzgeci kaldırır", async () => {
    ciz(veri([satir("S-1")]), {
      durum: listeDurumunuOku(siparisListesiTanimi, { odeme: "havale", sayfa: "2" }),
    });
    await ac();
    fireEvent.click(
      panel().getByRole("radio", { name: metin("yonetim.liste.tarih.hazir.son-7-gun") }),
    );
    await uygula();
    expect(git).toHaveBeenLastCalledWith("/yonetim/siparisler?tarih=son-7-gun&odeme=havale", {
      scroll: false,
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    await ac();
    await act(async () => {
      fireEvent.click(panel().getByRole("button", { name: metin("yonetim.liste.tarih.temizle") }));
    });
    expect(git).toHaveBeenLastCalledWith("/yonetim/siparisler?odeme=havale", { scroll: false });
  });

  it("iki gün: boşta ve ters sırada alanın hatası ve odak, istek gitmez; düzelince adrese yazılır", async () => {
    ciz(veri([satir("S-1")]));
    await ac();
    fireEvent.click(panel().getByRole("radio", { name: metin("yonetim.liste.tarih.ozel") }));
    const baslangic = panel().getByLabelText(metin("yonetim.liste.tarih.baslangic"));
    const bitis = panel().getByLabelText(metin("yonetim.liste.tarih.bitis"));
    await uygula();
    expect(git).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(baslangic);
    expect(baslangic.getAttribute("aria-invalid")).toBe("true");
    expect(panel().getByText(metin("yonetim.liste.tarih.hata.bos"))).toBeDefined();
    fireEvent.change(baslangic, { target: { value: "2026-11-21" } });
    fireEvent.change(bitis, { target: { value: "2026-11-01" } });
    // Yazınca hata kalkar.
    expect(panel().queryByText(metin("yonetim.liste.tarih.hata.bos"))).toBeNull();
    await uygula();
    expect(git).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(bitis);
    expect(bitis.getAttribute("aria-invalid")).toBe("true");
    expect(panel().getByText(metin("yonetim.liste.tarih.hata.sira"))).toBeDefined();
    fireEvent.change(baslangic, { target: { value: "2026-11-01" } });
    fireEvent.change(bitis, { target: { value: "2026-11-21" } });
    await uygula();
    expect(git).toHaveBeenLastCalledWith("/yonetim/siparisler?tarih=2026-11-01_2026-11-21", {
      scroll: false,
    });
    // Tek uç da olur (adres değişmediği için panel yine seçimsiz açılır).
    await ac();
    fireEvent.click(panel().getByRole("radio", { name: metin("yonetim.liste.tarih.ozel") }));
    fireEvent.change(panel().getByLabelText(metin("yonetim.liste.tarih.bitis")), {
      target: { value: "2026-11-21" },
    });
    await uygula();
    expect(git).toHaveBeenLastCalledWith("/yonetim/siparisler?tarih=_2026-11-21", {
      scroll: false,
    });
  });

  it("panel adresteki değerle açılır; şeritte günler sunucunun yazılışıyla, hazır aralık adıyla", async () => {
    ciz(veri([satir("S-1")]), {
      durum: listeDurumunuOku(siparisListesiTanimi, { tarih: "2026-11-01_2026-11-21" }),
      gunYazilari: { "2026-11-01": "01.11.2026", "2026-11-21": "21.11.2026" },
    });
    const serit = within(
      screen.getByRole("list", { name: metin("yonetim.liste.seciliSuzgecler") }),
    );
    const cip = serit.getByRole("link", { name: /01\.11\.2026 – 21\.11\.2026/ });
    expect(cip.textContent).toBe("Tarih: 01.11.2026 – 21.11.2026");
    expect(cip.getAttribute("href")).toBe("/yonetim/siparisler");
    // Düğme seçili süzgeci sayısıyla gösterir.
    expect(tarihDugmesi().textContent).toContain("1");
    await ac();
    expect(
      panel()
        .getByRole("radio", { name: metin("yonetim.liste.tarih.ozel") })
        .getAttribute("aria-checked"),
    ).toBe("true");
    expect(
      (panel().getByLabelText(metin("yonetim.liste.tarih.baslangic")) as HTMLInputElement).value,
    ).toBe("2026-11-01");
    cleanup();
    ciz(veri([satir("S-1")]), {
      durum: listeDurumunuOku(siparisListesiTanimi, { tarih: "son-30-gun" }),
    });
    expect(screen.getByRole("link", { name: /Tarih: Son 30 gün/ })).toBeDefined();
    cleanup();
    ciz(veri([satir("S-1")]), {
      durum: listeDurumunuOku(siparisListesiTanimi, { tarih: "2026-11-01_" }),
      gunYazilari: { "2026-11-01": "01.11.2026" },
    });
    expect(screen.getByRole("link", { name: /Tarih: 01\.11\.2026 ve sonrası/ })).toBeDefined();
  });

  it("kargo firması şeritte adıyla (listede olmayan ad da), kaldırma bağlantısı kodlanmış adresle", () => {
    ciz(veri([satir("S-1")]), {
      durum: listeDurumunuOku(siparisListesiTanimi, {
        kargo: `${encodeURIComponent("Hızlı, Kargo")},Eski%20Firma`,
      }),
    });
    const serit = within(
      screen.getByRole("list", { name: metin("yonetim.liste.seciliSuzgecler") }),
    );
    expect(
      serit.getByRole("link", { name: /Kargo firması: Hızlı, Kargo/ }).getAttribute("href"),
    ).toBe("/yonetim/siparisler?kargo=Eski%2520Firma");
    expect(serit.getByRole("link", { name: /Kargo firması: Eski Firma/ })).toBeDefined();
  });

  it("seçeneği olmayan kargo süzgecinin düğmesi yok; seçili değer varsa düğme durur", () => {
    const kargoDugmesi = () =>
      screen.queryByRole("button", {
        name: new RegExp(`^${metin("yonetim.siparisler.kargoSuzgeci")}`),
      });
    ciz(veri([satir("S-1")]), { kargo: [] });
    expect(kargoDugmesi()).toBeNull();
    cleanup();
    ciz(veri([satir("S-1")]), {
      kargo: [],
      durum: listeDurumunuOku(siparisListesiTanimi, { kargo: "Aras" }),
    });
    expect(kargoDugmesi()).not.toBeNull();
    cleanup();
    ciz(veri([satir("S-1")]));
    expect(kargoDugmesi()).not.toBeNull();
  });

  it("bakılması gereken sekmesi sayısıyla; satırda sonucu beklenen iade işareti", () => {
    ciz(
      veri(
        [
          satir("S-1", { iadeBekliyor: true }),
          satir("S-2", { talepOnaylandi: true, iadeBasarisiz: true }),
        ],
        {
          sekmeSayilari: { "": 1, "odeme-bekleniyor": 1, bakilacak: 1 },
        },
      ),
      { durum: listeDurumunuOku(siparisListesiTanimi, { durum: "iade-talebi" }) },
    );
    const sekmeler = within(
      screen.getByRole("navigation", { name: metin("yonetim.siparisler.durumSuzgeci") }),
    );
    const sekme = sekmeler.getByRole("link", { name: /Bakılması gereken/ });
    expect(sekme.getAttribute("aria-current")).toBe("page");
    expect(sekme.getAttribute("href")).toBe("/yonetim/siparisler?durum=bakilacak");
    expect(tablo().getByText(metin("yonetim.siparisler.iadeBekliyor"))).toBeDefined();
    expect(tablo().getByText(metin("yonetim.siparisler.talepOnaylandi"))).toBeDefined();
    expect(tablo().getByText(metin("yonetim.siparisler.iadeBasarisiz"))).toBeDefined();
  });
});
