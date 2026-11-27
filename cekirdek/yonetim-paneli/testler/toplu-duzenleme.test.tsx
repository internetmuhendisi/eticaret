// @vitest-environment jsdom
// Ürünlerde toplu düzenlemenin penceresi (kart 0314, karar 0189), ürünler listesiyle: çubukta dört düzenleme durum
// işlemlerinden önce ve yalnız izni olana; fiyat penceresinin gönderdiği önizleme girdisi, alanın hatası ve odağı,
// önizlemenin tablosu, özeti ve işlenmeyecek ürünleri, form değişince önizlemenin düşmesi; uygulamanın yalnız
// değişecek ürünleri görülen değerlerle göndermesi, sonucun listede söylenmesi (önizlemede işlenmeyecek görünen
// ürünler de), odağın sonuca gitmesi ve seçimin yalnız işlenemeyenlerde kalması; indirimli fiyatta zaman alanları;
// stok girdisi; kategori seçilmeden istek gitmemesi; Vazgeç. Uç sahte fetch ile verilir, yönlendirici taklittir.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { listeDurumunuOku } from "../liste/tanim.ts";
import { UrunListesi } from "../urunler/liste.tsx";
import { urunListesiTanimi } from "../urunler/liste-tanimi.ts";
import type { TopluOnizlemeVerisi } from "../urunler/toplu-duzenleme-verisi.ts";
import type { UrunSatiri } from "../urunler/veri.ts";

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const yenile = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: yenile, push: vi.fn() }),
  usePathname: () => "/yonetim/urunler",
}));

const metin = metinOkuyucu("tr");
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

const satir = (kimlik: string, ad: string): UrunSatiri => ({
  kimlik,
  ad,
  adresAdi: ad.toLowerCase(),
  stokKodu: null,
  birlesim: 0,
  durum: "yayinda",
  yayinZamani: null,
  kategoriler: [],
  fiyat: { yazi: "249,90 ¤" },
  stok: { durum: "stokta", toplam: 3, tukenenBirlesim: 0 },
  vitrinde: true,
});
const satirlar = [satir(A, "Deneme Mumu"), satir(B, "Bez Çanta"), satir(C, "Fiyatsız")];

const istekler: { adres: string; govde: unknown }[] = [];
let yanit: (adres: string) => Response;
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
      return yanit(adres);
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const ciz = (topluIslemler = urunListesiTanimi.topluIslemler.map((islem) => islem.kod)) =>
  render(
    <MetinSaglayici dil="tr">
      <UrunListesi
        durum={listeDurumunuOku(urunListesiTanimi, {})}
        veri={{
          satirlar,
          toplam: 3,
          sayfa: 1,
          sayfaSayisi: 1,
          sayfaBoyu: 25,
          sekmeSayilari: {},
        }}
        kayitSecenekleri={{}}
        topluIslemler={topluIslemler}
        para={{ simge: "¤", simgeYeri: "sonda" }}
        kopyalayabilir={false}
        fiyatIzni={false}
      />
    </MetinSaglayici>,
  );

const tablo = () => within(screen.getByRole("table", { name: metin("yonetim.urunler.liste") }));
const hepsiniSec = () => {
  for (const ad of ["Deneme Mumu", "Bez Çanta", "Fiyatsız"]) {
    fireEvent.click(tablo().getByRole("checkbox", { name: `Seç: ${ad}` }));
  }
};
const cubuk = () => within(screen.getByRole("region", { name: metin("yonetim.liste.topluIslem") }));
const pencere = () => within(screen.getByRole("dialog"));
const bekle = () => act(async () => {});

const onizleme: TopluOnizlemeVerisi = {
  urunler: [
    {
      kimlik: A,
      ad: "Deneme Mumu",
      degisir: true,
      satirlar: [{ degerler: [], satis: "249,90 ¤", eski: "249,90 ¤", yeni: "274,89 ¤" }],
    },
    {
      kimlik: B,
      ad: "Bez Çanta",
      degisir: true,
      satirlar: [
        { degerler: ["Kırmızı"], satis: "129,90 ¤", eski: "129,90 ¤", yeni: "142,89 ¤" },
        { degerler: ["Mavi"], satis: null, eski: null, yeni: null, neden: "fiyat-yok" },
      ],
    },
    { kimlik: C, ad: "Fiyatsız", degisir: false, neden: "fiyat-yok", satirlar: [] },
  ],
  urunSayisi: 2,
  birimSayisi: 2,
  gorulen: {
    [A]: { a1: { satis: 24990, indirimli: null } },
    [B]: { b1: { satis: 12990, indirimli: null }, b2: { satis: null, indirimli: null } },
  },
};

describe("toplu düzenleme", () => {
  it("çubukta dört düzenleme durum işlemlerinden önce; izni olmayan görünmez", () => {
    ciz();
    hepsiniSec();
    const adlar = cubuk()
      .getAllByRole("button")
      .map((dugme) => dugme.textContent);
    expect(adlar.slice(0, 6)).toEqual([
      "Fiyatı değiştir",
      "Stoğu değiştir",
      "Kategoriye ekle",
      "Kategoriden çıkar",
      "Yayınla",
      "Taslağa al",
    ]);
    cleanup();
    ciz(["stok", "kategori-ekle", "kategori-cikar", "yayinla"]);
    hepsiniSec();
    expect(cubuk().queryByRole("button", { name: "Fiyatı değiştir" })).toBeNull();
    expect(cubuk().getByRole("button", { name: "Stoğu değiştir" })).toBeDefined();
  });

  it("fiyat: alanın hatası ve odağı; önizleme tablosu ve işlenmeyecekler; uygulama ve sonuç", async () => {
    ciz();
    hepsiniSec();
    fireEvent.click(cubuk().getByRole("button", { name: "Fiyatı değiştir" }));
    expect(pencere().getByText(/3 ürün seçili/)).toBeDefined();
    // Boş oran istek göndermez: alanın hatası alanın altında, odak alanda.
    fireEvent.click(pencere().getByRole("button", { name: "Önizle" }));
    await bekle();
    expect(istekler).toEqual([]);
    const oran = pencere().getByRole("textbox", { name: /Oran/ });
    expect(oran.getAttribute("aria-invalid")).toBe("true");
    expect(
      pencere().getByText(metin("yonetim.urunler.topluDuzenleme.hata.too_small")),
    ).toBeDefined();
    expect(document.activeElement).toBe(oran);

    // Sunucunun alan hatası da alanın altında yazar (okunamayan oran).
    yanit = () =>
      Response.json(
        {
          basarili: false,
          hata: { kod: "dogrulama", ayrinti: [{ alan: "duzenleme.deger", kod: "oran-okunamadi" }] },
        },
        { status: 400 },
      );
    fireEvent.change(oran, { target: { value: "on" } });
    fireEvent.click(pencere().getByRole("button", { name: "Önizle" }));
    await bekle();
    expect(oran.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(oran);
    expect(pencere().getByText(/Oranı sayı olarak, en çok 2 ondalıkla yazın/)).toBeDefined();

    yanit = () => Response.json({ basarili: true, veri: onizleme });
    fireEvent.change(oran, { target: { value: "10" } });
    fireEvent.click(pencere().getByRole("button", { name: "Önizle" }));
    await bekle();
    expect(istekler.at(-1)).toEqual({
      adres: "/kapi/yonetici/urunler-toplu-onizle",
      govde: {
        urunler: [A, B, C],
        duzenleme: {
          islem: "fiyat",
          hedef: "satis",
          yontem: "artir",
          birim: "oran",
          deger: "10",
          indirimBaslangici: null,
          indirimBitisi: null,
        },
      },
    });
    expect(pencere().getByText("2 ürün değişecek.")).toBeDefined();
    const onizlemeTablosu = within(
      pencere().getByRole("table", {
        name: metin("yonetim.urunler.topluDuzenleme.onizleme.tablo"),
      }),
    );
    expect(onizlemeTablosu.getByText("274,89 ¤")).toBeDefined();
    expect(onizlemeTablosu.getByText("Bez Çanta: Kırmızı")).toBeDefined();
    expect(onizlemeTablosu.getByText("fiyatı yok")).toBeDefined();
    expect(pencere().getByText("Fiyatsız: fiyatı yok")).toBeDefined();
    expect(document.activeElement?.textContent).toBe("Önizleme");

    // Form değişince önizleme düşer.
    fireEvent.change(oran, { target: { value: "12" } });
    expect(pencere().queryByText("Önizleme")).toBeNull();
    expect(pencere().getByRole("button", { name: "Önizle" })).toBeDefined();
    fireEvent.click(pencere().getByRole("button", { name: "Önizle" }));
    await bekle();

    yanit = () =>
      Response.json({
        basarili: true,
        veri: { islenen: [A], islenemeyen: [{ anahtar: B, kod: "degisti" }] },
      });
    fireEvent.click(pencere().getByRole("button", { name: "2 ürüne uygula" }));
    await bekle();
    expect(istekler.at(-1)).toMatchObject({
      adres: "/kapi/yonetici/urunler-toplu-duzenle",
      govde: { urunler: [A, B], gorulen: onizleme.gorulen, duzenleme: { deger: "12" } },
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    const sonuc = document.activeElement as HTMLElement;
    expect(sonuc.textContent).toContain("1 ürünün fiyatı değişti.");
    expect(sonuc.textContent).toContain(
      "Bez Çanta: siz önizlemeyi görürken değişti, yeniden önizleyin",
    );
    expect(sonuc.textContent).toContain("Fiyatsız: fiyatı yok");
    expect(yenile).toHaveBeenCalled();
    // Seçim yalnız işlenemeyenlerde kalır.
    expect(cubuk().getByText("2 seçili")).toBeDefined();
    expect(
      tablo().getByRole("checkbox", { name: "Seç: Deneme Mumu" }).getAttribute("aria-checked"),
    ).toBe("false");
  });

  it("indirimli fiyatta yöntem satıştan indirimdir, zaman gönderilir", async () => {
    ciz();
    hepsiniSec();
    fireEvent.click(cubuk().getByRole("button", { name: "Fiyatı değiştir" }));
    expect(pencere().queryByLabelText(/İndirim başlangıcı/)).toBeNull();
    fireEvent.click(pencere().getByRole("radio", { name: "İndirimli fiyat" }));
    expect(
      pencere().getByRole("radio", { name: "Satış fiyatından indir" }).getAttribute("aria-checked"),
    ).toBe("true");
    fireEvent.change(pencere().getByRole("textbox", { name: /Oran/ }), {
      target: { value: "15" },
    });
    fireEvent.change(pencere().getByLabelText(/İndirim bitişi/), {
      target: { value: "2026-12-31T23:59" },
    });
    yanit = () => Response.json({ basarili: true, veri: onizleme });
    fireEvent.click(pencere().getByRole("button", { name: "Önizle" }));
    await bekle();
    expect(istekler.at(-1)?.govde).toMatchObject({
      duzenleme: {
        hedef: "indirimli",
        yontem: "satistan-indir",
        deger: "15",
        indirimBaslangici: null,
        indirimBitisi: "2026-12-31T23:59",
      },
    });
  });

  it("stok girdisi; kategori seçilmeden istek gitmez; Vazgeç kapatır", async () => {
    ciz();
    hepsiniSec();
    fireEvent.click(cubuk().getByRole("button", { name: "Stoğu değiştir" }));
    fireEvent.click(pencere().getByRole("radio", { name: "Şu miktara çek" }));
    fireEvent.change(pencere().getByRole("textbox", { name: /Miktar/ }), {
      target: { value: "0" },
    });
    yanit = () =>
      Response.json({ basarili: true, veri: { ...onizleme, urunSayisi: 0, gorulen: {} } });
    fireEvent.click(pencere().getByRole("button", { name: "Önizle" }));
    await bekle();
    expect(istekler.at(-1)?.govde).toMatchObject({
      duzenleme: { islem: "stok", yontem: "cek", miktar: "0", sebep: "yeni-mal" },
    });
    expect(
      pencere().getByText(metin("yonetim.urunler.topluDuzenleme.onizleme.degisenYok")),
    ).toBeDefined();
    // Değişmiş formda Vazgeç önce sorar; bırakınca pencere kapanır.
    fireEvent.click(pencere().getByRole("button", { name: metin("ortak.islem.vazgec") }));
    fireEvent.click(pencere().getByRole("button", { name: metin("yonetim.bolumler.form.birak") }));
    expect(screen.queryByRole("dialog")).toBeNull();

    istekler.length = 0;
    fireEvent.click(cubuk().getByRole("button", { name: "Kategoriye ekle" }));
    fireEvent.click(pencere().getByRole("button", { name: "Önizle" }));
    await bekle();
    expect(istekler).toEqual([]);
    expect(
      pencere().getByText(metin("yonetim.urunler.topluDuzenleme.hata.kategoriSec")),
    ).toBeDefined();
  });
});
