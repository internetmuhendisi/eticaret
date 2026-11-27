// @vitest-environment jsdom
// Ürün kopyalama penceresi (kart 0320, karar 0190): ürün listesinin satır menüsündeki "Kopyala" pencereyi o ürünle
// açar, ad "… (kopya)" önerisiyle gelir, kopyalanmayanlar yazar; boş ad istek göndermez, alanın hatası ve odak;
// gönderilen girdi ve kopyanın ürün ekranına geçiş (?kopya=1); sunucunun ad hatası alanda, bulunamadı özette;
// kopyalama izni olmayana satır menüsü yok; ürün ekranının "Kopyala" düğmesi. Uç sahte fetch ile verilir,
// yönlendirici taklittir.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { listeDurumunuOku } from "../liste/tanim.ts";
import { UrunKopyalaDugmesi, UrunKopyalamaPenceresi } from "../urunler/kopyalama.tsx";
import { UrunListesi } from "../urunler/liste.tsx";
import { urunListesiTanimi } from "../urunler/liste-tanimi.ts";
import type { UrunSatiri } from "../urunler/veri.ts";

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const git = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: git }),
  usePathname: () => "/yonetim/urunler",
}));

const metin = metinOkuyucu("tr");
const A = "11111111-1111-4111-8111-111111111111";
const YENI = "99999999-9999-4999-8999-999999999999";

const satir: UrunSatiri = {
  kimlik: A,
  ad: "Deneme Kazağı",
  adresAdi: "deneme-kazagi",
  stokKodu: null,
  birlesim: 0,
  durum: "yayinda",
  yayinZamani: null,
  kategoriler: [],
  fiyat: { yazi: "100,00 ¤" },
  stok: { durum: "stokta", toplam: 3, tukenenBirlesim: 0 },
  vitrinde: true,
};

const istekler: { adres: string; govde: unknown }[] = [];
let yanit: () => Response;
beforeEach(() => {
  istekler.length = 0;
  git.mockReset();
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

const liste = (kopyalayabilir: boolean) =>
  render(
    <MetinSaglayici dil="tr">
      <UrunListesi
        durum={listeDurumunuOku(urunListesiTanimi, {})}
        veri={{
          satirlar: [satir],
          toplam: 1,
          sayfa: 1,
          sayfaSayisi: 1,
          sayfaBoyu: 25,
          sekmeSayilari: {},
        }}
        kayitSecenekleri={{}}
        topluIslemler={[]}
        para={{ simge: "¤", simgeYeri: "sonda" }}
        kopyalayabilir={kopyalayabilir}
        fiyatIzni={false}
      />
    </MetinSaglayici>,
  );

const bekle = () => act(async () => {});
const pencere = () => within(screen.getByRole("dialog"));
const menudenAc = async () => {
  const tablo = within(screen.getByRole("table", { name: metin("yonetim.urunler.liste") }));
  const tetik = tablo.getByRole("button", { name: "Diğer işlemler: Deneme Kazağı" });
  fireEvent.pointerDown(tetik, { button: 0, pointerType: "mouse" });
  fireEvent.click(await screen.findByRole("menuitem", { name: "Kopyala" }));
  // Pencere menü odağı geri verdikten sonra açılır (useMenudenPencere).
  await screen.findByRole("dialog");
};

describe("ürün kopyalama", () => {
  it("satır menüsünden açılır; ad önerisi, kopyalanmayanlar; boş adda istek gitmez; kopyalanınca kopyaya gider", async () => {
    liste(true);
    await menudenAc();
    const ad = pencere().getByRole("textbox", { name: /Kopyanın adı/ });
    expect((ad as HTMLInputElement).value).toBe("Deneme Kazağı (kopya)");
    // Bu listenin yöneticisinin fiyat izni yok: kopya fiyatsızdır, pencere söyler.
    expect(pencere().getByText(metin("yonetim.urunKopyalama.kopyalanmayanFiyatsiz"))).toBeDefined();
    expect(pencere().queryByText(metin("yonetim.urunKopyalama.kaydedilmemis"))).toBeNull();
    expect(pencere().getByText(/Deneme Kazağı taslak olarak kopyalanacak/)).toBeDefined();

    fireEvent.change(ad, { target: { value: "  " } });
    fireEvent.click(pencere().getByRole("button", { name: "Kopyala" }));
    await bekle();
    expect(istekler).toEqual([]);
    expect(ad.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(ad);

    yanit = () => Response.json({ basarili: true, veri: { kimlik: YENI } });
    fireEvent.change(ad, { target: { value: "Kazak kopyası" } });
    fireEvent.click(pencere().getByRole("button", { name: "Kopyala" }));
    await bekle();
    expect(istekler).toEqual([
      { adres: "/kapi/yonetici/urun-kopyala", govde: { kimlik: A, ad: "Kazak kopyası" } },
    ]);
    expect(git).toHaveBeenCalledWith(`/yonetim/urunler/urun?kimlik=${YENI}&kopya=1`);
    // Pencere kapanır (kopyanın ekranı aynı sayfa bileşeniyle açılır).
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("sunucunun ad hatası alanda (kayda uygun olmayan ad kendi metniyle), bulunamadı özette yazar", async () => {
    liste(true);
    await menudenAc();
    yanit = () =>
      Response.json(
        { basarili: false, hata: { kod: "dogrulama", ayrinti: [{ alan: "ad", kod: "too_big" }] } },
        { status: 400 },
      );
    fireEvent.click(pencere().getByRole("button", { name: "Kopyala" }));
    await bekle();
    const ad = pencere().getByRole("textbox", { name: /Kopyanın adı/ });
    expect(ad.getAttribute("aria-invalid")).toBe("true");
    expect(pencere().getByText(metin("yonetim.urunKopyalama.hata.ad"))).toBeDefined();
    yanit = () =>
      Response.json(
        {
          basarili: false,
          hata: { kod: "dogrulama", ayrinti: [{ alan: "ad", kod: "kayda-uygun-degil" }] },
        },
        { status: 400 },
      );
    fireEvent.click(pencere().getByRole("button", { name: "Kopyala" }));
    await bekle();
    expect(pencere().getByText(metin("yonetim.urunKopyalama.hata.adKayit"))).toBeDefined();

    yanit = () => Response.json({ basarili: false, hata: { kod: "bulunamadi" } }, { status: 404 });
    fireEvent.click(pencere().getByRole("button", { name: "Kopyala" }));
    await bekle();
    expect(pencere().getByText(metin("yonetim.urunKopyalama.hata.bulunamadi"))).toBeDefined();
    expect(git).not.toHaveBeenCalled();
  });

  it("kopyalama izni olmayana satır menüsü yoktur; ürün ekranının düğmesi pencereyi açar", () => {
    liste(false);
    expect(screen.queryByRole("button", { name: /Diğer işlemler/ })).toBeNull();
    cleanup();
    render(
      <MetinSaglayici dil="tr">
        <UrunKopyalaDugmesi urun={{ kimlik: A, ad: "Deneme Kazağı" }} fiyatIzni />
      </MetinSaglayici>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Kopyala" }));
    expect(pencere().getByRole("heading", { name: "Ürünü kopyala" })).toBeDefined();
    // Fiyat izni olan: fiyatlar da kopyalanır.
    expect(pencere().getByText(metin("yonetim.urunKopyalama.kopyalanmayan"))).toBeDefined();
  });

  it("açıldığı sayfada kaydedilmemiş değişiklik varsa pencere söyler", () => {
    render(
      <MetinSaglayici dil="tr">
        <UrunKopyalamaPenceresi
          urun={{ kimlik: A, ad: "Deneme Kazağı" }}
          kapat={() => undefined}
          fiyatIzni
          kaydedilmemis
        />
      </MetinSaglayici>,
    );
    expect(pencere().getByText(metin("yonetim.urunKopyalama.kaydedilmemis"))).toBeDefined();
  });
});
