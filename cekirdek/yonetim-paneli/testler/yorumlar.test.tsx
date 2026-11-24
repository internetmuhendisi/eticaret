// @vitest-environment jsdom
// Yorumlar ekranı (kart 0277, karar 0174): liste her genişlikte kart (tablo yok); sekmeler "Tümü" olmadan, Onay
// bekleyen seçili; varsayılan sekme boşken öteki sekmede yorum varsa arama ve süzgeç durur; eylemler yorumun durumuna
// göre ve yalnız karar izni olana; ürün bağlantısı yalnız ürünleri görene, vitrin bağlantısı yalnız sayfası açık
// üründe; metin düz yazı; eylemin isteği, sayfanın yenilenmesi ve odağın kartta, sonraki kartta ya da sekmede
// kalması (sonraki yoksa yenilenen listede aynı sıradaki karta; liste değiştiyse taşınmaz); eylem ve toplu işlem
// ekranın gördüğü durumu gönderir; toplu işlemler sekmeye göre; istek sürerken kartın düğmeleri aria-disabled, öteki
// kart çalışır. Uç sahte fetch ile verilir, yönlendirici taklittir.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { type ListeDurumu, type ListeVerisi, listeDurumunuOku } from "../liste/tanim.ts";
import { YorumListesi } from "../yorumlar/liste.tsx";
import { yorumListesiTanimi } from "../yorumlar/liste-tanimi.ts";
import type { YorumSatiri } from "../yorumlar/veri.ts";

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const yenile = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: yenile, push: vi.fn() }) }));

const metin = metinOkuyucu("tr");

const satir = (kimlik: string, ek: Partial<YorumSatiri> = {}): YorumSatiri => ({
  kimlik,
  puan: 4,
  puanYazisi: "4",
  baslik: null,
  metin: `Metin ${kimlik}`,
  ad: `Ad ${kimlik}`,
  dogrulanmisAlici: false,
  durum: "onay-bekliyor",
  anaSayfada: false,
  zaman: "20.11.2026 21.14",
  urun: { kimlik: `u-${kimlik}`, ad: `Ürün ${kimlik}`, adresAdi: `urun-${kimlik}`, vitrinde: true },
  ...ek,
});

const veri = (
  satirlar: YorumSatiri[],
  sayilar: Record<string, number> = {},
): ListeVerisi<YorumSatiri> => ({
  satirlar,
  toplam: satirlar.length,
  sayfa: 1,
  sayfaSayisi: 1,
  sayfaBoyu: 25,
  sekmeSayilari: {
    "onay-bekliyor": satirlar.length,
    yayinda: 0,
    reddedildi: 0,
    "": satirlar.length,
    ...sayilar,
  },
});

const istekler: { adres: string; govde: unknown }[] = [];
beforeEach(() => {
  istekler.length = 0;
  yenile.mockReset();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (adres: string, secenek?: RequestInit) => {
      istekler.push({
        adres,
        govde: secenek?.body === undefined ? undefined : JSON.parse(String(secenek.body)),
      });
      const govde = String(adres).includes("toplu")
        ? { basarili: true, veri: { islenen: ["a"], islenemeyen: [] } }
        : { basarili: true, veri: {} };
      return new Response(JSON.stringify(govde), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const ekran = (
  v: ListeVerisi<YorumSatiri> | null,
  {
    durum = listeDurumunuOku(yorumListesiTanimi, {}),
    kararVerir = true,
    urunGorur = true,
    topluIslemler = ["yayinla", "reddet"],
  }: {
    durum?: ListeDurumu;
    kararVerir?: boolean;
    urunGorur?: boolean;
    topluIslemler?: string[];
  } = {},
) => (
  <MetinSaglayici dil="tr">
    <YorumListesi
      durum={durum}
      veri={v}
      topluIslemler={topluIslemler}
      kararVerir={kararVerir}
      urunGorur={urunGorur}
    />
  </MetinSaglayici>
);

const kart = (kimlik: string) =>
  within(document.querySelector<HTMLElement>(`[data-yorum="${kimlik}"]`) as HTMLElement);
const dugmeAdi = (eylem: string, kimlik: string) => `${eylem}: Ad ${kimlik}, Ürün ${kimlik}`;

describe("liste", () => {
  it("her genişlikte kart; sekmelerde 'Tümü' yok, Onay bekleyen seçili; sayısız sekme gizli", () => {
    render(ekran(veri([satir("a")], { yayinda: 3 })));
    expect(screen.queryByRole("table")).toBeNull();
    const liste = screen.getByRole("list", { name: metin("yonetim.yorumlar.liste") });
    expect(liste.className).not.toContain("tablet:hidden");
    const sekmeler = within(screen.getByRole("navigation", { name: "Yorum durumu" }));
    expect(sekmeler.queryByText(metin("yonetim.liste.tumu"))).toBeNull();
    const bekleyen = sekmeler.getByRole("link", { name: /Onay bekleyen/ });
    expect(bekleyen.getAttribute("aria-current")).toBe("page");
    expect(bekleyen.getAttribute("href")).toBe("/yonetim/yorumlar");
    expect(sekmeler.getByRole("link", { name: /Yayında/ }).getAttribute("href")).toBe(
      "/yonetim/yorumlar?durum=yayinda",
    );
    expect(sekmeler.queryByRole("link", { name: /Reddedilen/ })).toBeNull();
  });

  it("varsayılan sekme boşken öteki sekmede yorum varsa arama durur, boş hâl söylenir", () => {
    render(ekran(veri([], { yayinda: 2, "": 2 })));
    expect(screen.getByRole("search")).toBeDefined();
    expect(screen.getByText(metin("yonetim.yorumlar.bos.baslik"))).toBeDefined();
    cleanup();
    render(ekran(veri([], { "": 0 })));
    expect(screen.queryByRole("search")).toBeNull();
    expect(screen.getByText(metin("yonetim.yorumlar.bos.baslik"))).toBeDefined();
  });

  it("kart: ürün, puan, ad, rozetler, tarih, başlık ve düz metin; vitrin bağlantısı yalnız sayfası açık üründe", () => {
    render(
      ekran(
        veri([
          satir("a", {
            baslik: "Güzel",
            metin: "<b>kalın</b>\nikinci satır",
            dogrulanmisAlici: true,
            durum: "yayinda",
            anaSayfada: true,
          }),
          satir("b", {
            urun: { kimlik: "u-b", ad: "Ürün b", adresAdi: "urun-b", vitrinde: false },
          }),
        ]),
      ),
    );
    const a = kart("a");
    expect(a.getByRole("link", { name: "Ürün a" }).getAttribute("href")).toBe(
      "/yonetim/urunler/urun?kimlik=u-a",
    );
    expect(a.getByText("5 üzerinden 4")).toBeDefined();
    expect(a.getByText("Ad a")).toBeDefined();
    expect(a.getByText(metin("yonetim.yorumlar.dogrulanmisAlici"))).toBeDefined();
    expect(a.getByText(metin("yonetim.yorumlar.anaSayfada"))).toBeDefined();
    expect(a.getByText("Güzel")).toBeDefined();
    // HTML yazı olarak çizilir.
    expect(a.getByText(/<b>kalın<\/b>/)).toBeDefined();
    expect(document.querySelector('[data-yorum="a"] b')).toBeNull();
    expect(
      a
        .getByRole("link", { name: "Vitrinde gör: Ürün a (yeni sekmede açılır)" })
        .getAttribute("href"),
    ).toBe("/urun/urun-a");
    expect(kart("b").queryByRole("link", { name: /Vitrinde gör/ })).toBeNull();
  });

  it("ürünleri göremeyen yöneticide ürün adı bağlantı değildir", () => {
    render(ekran(veri([satir("a")]), { urunGorur: false }));
    expect(kart("a").queryByRole("link", { name: "Ürün a" })).toBeNull();
    expect(kart("a").getByText("Ürün a")).toBeDefined();
  });
});

describe("eylemler", () => {
  it("duruma göre: bekleyende Yayınla ve Reddet, yayındakinde ana sayfa ve Yayından kaldır, reddedilende Yayınla", () => {
    render(
      ekran(
        veri([
          satir("a"),
          satir("b", { durum: "yayinda" }),
          satir("c", { durum: "yayinda", anaSayfada: true }),
          satir("d", { durum: "reddedildi" }),
        ]),
      ),
    );
    const adlar = (kimlik: string) =>
      kart(kimlik)
        .getAllByRole("button")
        .map((dugme) => dugme.getAttribute("aria-label"));
    expect(adlar("a")).toEqual([dugmeAdi("Yayınla", "a"), dugmeAdi("Reddet", "a")]);
    expect(adlar("b")).toEqual([
      dugmeAdi("Ana sayfada göster", "b"),
      dugmeAdi("Yayından kaldır", "b"),
    ]);
    expect(adlar("c")).toEqual([
      dugmeAdi("Ana sayfadan kaldır", "c"),
      dugmeAdi("Yayından kaldır", "c"),
    ]);
    expect(adlar("d")).toEqual([dugmeAdi("Yayınla", "d")]);
  });

  it("karar izni olmayana eylem ve seçim yoktur", () => {
    render(ekran(veri([satir("a")]), { kararVerir: false, topluIslemler: [] }));
    expect(kart("a").queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("eylem doğru uca gider, sayfa yenilenir; kart kalırsa odak onun ilk düğmesinde", async () => {
    const { rerender } = render(ekran(veri([satir("a", { durum: "yayinda" })])));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: dugmeAdi("Ana sayfada göster", "a") }));
    });
    expect(istekler).toEqual([
      { adres: "/kapi/yonetici/yorum-ana-sayfa", govde: { yorum: "a", anaSayfada: true } },
    ]);
    expect(yenile).toHaveBeenCalled();
    rerender(ekran(veri([satir("a", { durum: "yayinda", anaSayfada: true })])));
    expect(document.activeElement?.getAttribute("aria-label")).toBe(
      dugmeAdi("Ana sayfadan kaldır", "a"),
    );
  });

  it("kart sekmeden çıkınca odak sonraki karta, sonraki yoksa öncekine, liste boşalınca seçili sekmeye", async () => {
    const { rerender } = render(ekran(veri([satir("a"), satir("b"), satir("c")])));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: dugmeAdi("Yayınla", "b") }));
    });
    expect(istekler[0]).toEqual({
      adres: "/kapi/yonetici/yorum-karari",
      govde: { yorum: "b", durum: "yayinda", gorulen: "onay-bekliyor" },
    });
    rerender(ekran(veri([satir("a"), satir("c")])));
    expect(document.activeElement?.getAttribute("aria-label")).toBe(dugmeAdi("Yayınla", "c"));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: dugmeAdi("Reddet", "c") }));
    });
    expect(istekler[1]?.govde).toEqual({
      yorum: "c",
      durum: "reddedildi",
      gorulen: "onay-bekliyor",
    });
    rerender(ekran(veri([satir("a")])));
    expect(document.activeElement?.getAttribute("aria-label")).toBe(dugmeAdi("Yayınla", "a"));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: dugmeAdi("Yayınla", "a") }));
    });
    rerender(ekran(veri([], { "": 3, yayinda: 2, reddedildi: 1 })));
    expect(document.activeElement?.getAttribute("aria-current")).toBe("page");
    expect(document.activeElement?.textContent).toContain("Onay bekleyen");
  });

  it("istek sürerken kartın düğmeleri aria-disabled, ikinci basış istek göndermez; öteki kart çalışır", async () => {
    let bitir: () => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn(async (adres: string, secenek?: RequestInit) => {
        istekler.push({ adres, govde: JSON.parse(String(secenek?.body)) });
        await new Promise<void>((tamam) => {
          bitir = tamam;
        });
        return new Response(JSON.stringify({ basarili: true, veri: {} }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );
    render(ekran(veri([satir("a"), satir("b")])));
    const dugme = screen.getByRole("button", { name: dugmeAdi("Yayınla", "a") });
    await act(async () => {
      fireEvent.click(dugme);
    });
    expect(dugme.getAttribute("aria-disabled")).toBe("true");
    expect(
      screen.getByRole("button", { name: dugmeAdi("Reddet", "a") }).getAttribute("aria-disabled"),
    ).toBe("true");
    await act(async () => {
      fireEvent.click(dugme);
    });
    expect(istekler).toHaveLength(1);
    const oteki = screen.getByRole("button", { name: dugmeAdi("Reddet", "b") });
    expect(oteki.getAttribute("aria-disabled")).toBeNull();
    await act(async () => {
      fireEvent.click(oteki);
    });
    expect(istekler).toHaveLength(2);
    await act(async () => {
      bitir();
    });
  });

  it("sonraki kart yoksa odak yenilenen listede aynı sıradaki karta (sonraki sayfadan kayan), önceki karta değil", async () => {
    const { rerender } = render(ekran(veri([satir("a"), satir("b")])));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: dugmeAdi("Yayınla", "b") }));
    });
    rerender(ekran(veri([satir("a"), satir("z")])));
    expect(document.activeElement?.getAttribute("aria-label")).toBe(dugmeAdi("Yayınla", "z"));
  });

  it("liste gelmeden sekme ya da süzgeç değiştiyse odak taşınmaz", async () => {
    const { rerender } = render(ekran(veri([satir("a"), satir("b")])));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: dugmeAdi("Yayınla", "a") }));
    });
    const once = document.activeElement;
    rerender(
      ekran(veri([satir("y", { durum: "yayinda" })]), {
        durum: listeDurumunuOku(yorumListesiTanimi, { durum: "yayinda" }),
      }),
    );
    expect(document.activeElement).toBe(once);
  });

  it("toplu işlemler sekmeye göre: onay bekleyende ikisi, yayındakinde yalnız reddet, reddedilende yalnız yayınla", () => {
    const cubukIslemleri = (sekme: string, durumu: YorumSatiri["durum"]) => {
      cleanup();
      render(
        ekran(veri([satir("a", { durum: durumu })]), {
          durum: listeDurumunuOku(yorumListesiTanimi, { durum: sekme }),
        }),
      );
      fireEvent.click(screen.getByRole("checkbox", { name: "Seç: Ad a, Ürün a" }));
      return within(screen.getByRole("region", { name: metin("yonetim.liste.topluIslem") }))
        .getAllByRole("button")
        .map((dugme) => dugme.textContent)
        .filter((yazi) => yazi !== metin("yonetim.liste.secimiKaldir"));
    };
    expect(cubukIslemleri("onay-bekliyor", "onay-bekliyor")).toEqual(["Yayınla", "Reddet"]);
    expect(cubukIslemleri("yayinda", "yayinda")).toEqual(["Reddet"]);
    expect(cubukIslemleri("reddedildi", "reddedildi")).toEqual(["Yayınla"]);
  });

  it("toplu işlem seçilenleri gönderir, izni olmayan işlem görünmez", async () => {
    render(ekran(veri([satir("a"), satir("b")])));
    fireEvent.click(screen.getByRole("checkbox", { name: "Seç: Ad a, Ürün a" }));
    const cubuk = within(screen.getByRole("region", { name: metin("yonetim.liste.topluIslem") }));
    fireEvent.click(cubuk.getByRole("button", { name: "Reddet" }));
    const onay = within(screen.getByRole("alertdialog"));
    expect(onay.getByText("1 yorum reddedilsin mi?")).toBeDefined();
    await act(async () => {
      fireEvent.click(onay.getByRole("button", { name: "Reddet" }));
    });
    expect(istekler).toEqual([
      {
        adres: "/kapi/yonetici/yorumlar-toplu",
        govde: { islem: "reddet", yorumlar: [{ yorum: "a", gorulen: "onay-bekliyor" }] },
      },
    ]);
    cleanup();
    render(ekran(veri([satir("a")]), { topluIslemler: ["yayinla"] }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Seç: Ad a, Ürün a" }));
    const yeniCubuk = within(
      screen.getByRole("region", { name: metin("yonetim.liste.topluIslem") }),
    );
    expect(yeniCubuk.queryByRole("button", { name: "Reddet" })).toBeNull();
    expect(yeniCubuk.getByRole("button", { name: "Yayınla" })).toBeDefined();
  });
});
