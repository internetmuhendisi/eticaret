// @vitest-environment jsdom
// Favoriler sayfasının listesi (kart 0140, karar 0110):
// - Durum bilinmezken iskelet, okunamazsa hata görünür; "liste boş" denmez. Sunucu çerezde hiç ürün görmediyse
//   boş hâl hemen görünür; hesapta favori çıkarsa sayfa yenilenir (kart 0146).
// - Sunucunun denetlemediği ürün varsa sayfa bir kez yenilenir, aynı liste için ikinci kez yenilenmez.
// - Sunucunun kartını çizmediği ürün (görünmeyen) gösterilmez ve sayılmaz; sıra tarayıcıdaki durumun sırasıdır.
// - Üye olmayan müşteriye "bu cihazda" bilgisi liste doluyken görünür; girişli müşteriye görünmez.
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { favoriDepoAnahtari } from "../../kayitlar/favori.ts";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { doldur } from "../../moduller/eposta/sablon.ts";
import { FavoriDugmesi } from "../favori-dugmesi.tsx";
import { FavoriSaglayici, favoriDurumunuSifirla } from "../favori-durumu.ts";
import { FavoriListesi } from "../favori-listesi.tsx";
import { hesapDurumunuSifirla } from "../hesap-durumu.ts";

const yenile = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: yenile }) }));

const metin = metinOkuyucu("tr");
const [a, b, c] = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
];

const yanit = (durum: number, govde: unknown) =>
  new Response(JSON.stringify(govde), { status: durum });
const hesap = (girisli: boolean | "hata", favoriler: string[] = []) =>
  vi.spyOn(globalThis, "fetch").mockImplementation(async (hedef) => {
    if (String(hedef) === "/kapi/musteri/hesabim") {
      if (girisli === "hata") return yanit(500, {});
      return girisli
        ? yanit(200, { basarili: true, veri: { eposta: "m@ornek.test" } })
        : yanit(401, { basarili: false, hata: { kod: "oturum-yok" } });
    }
    return yanit(200, { basarili: true, veri: { favoriler } });
  });

const ciz = (denetlenenler: string[], kartiOlanlar: string[]) =>
  render(
    <MetinSaglayici dil="tr">
      <FavoriSaglayici ayarlar={{ kip: "sorulur", sinir: 100 }}>
        <FavoriListesi
          baslik="Favorilerim"
          denetlenenler={denetlenenler}
          kartlar={kartiOlanlar.map((kimlik) => ({
            kimlik,
            kart: <span data-kart={kimlik} />,
          }))}
          izgara=""
          cihazdaBilgisi={<p data-testid="cihazda" />}
          bosHal={<p data-testid="bos" />}
        />
      </FavoriSaglayici>
    </MetinSaglayici>,
  );
const bekle = () => act(async () => {});
const kartlar = () =>
  screen
    .queryAllByRole("listitem")
    .map((oge) => oge.querySelector("[data-kart]")?.getAttribute("data-kart"));

beforeEach(() => {
  hesapDurumunuSifirla();
  favoriDurumunuSifirla();
  localStorage.clear();
  yenile.mockClear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const dugmeliCiz = (denetlenenler: string[]) =>
  render(
    <MetinSaglayici dil="tr">
      <FavoriSaglayici ayarlar={{ kip: "sorulur", sinir: 100 }}>
        <FavoriListesi
          baslik="Favorilerim"
          denetlenenler={denetlenenler}
          kartlar={denetlenenler.map((kimlik) => ({
            kimlik,
            kart: <FavoriDugmesi urun={kimlik} urunAdi={kimlik} />,
          }))}
          izgara=""
          cihazdaBilgisi={<p data-testid="cihazda" />}
          bosHal={<a href="/" data-testid="bos" />}
        />
      </FavoriSaglayici>
    </MetinSaglayici>,
  );

describe("favoriler sayfasının listesi", () => {
  it("çerezde ürün varken durum bilinmezse iskelet görünür, boş denmez", () => {
    hesap(false);
    ciz([a], [a]);
    expect(screen.getByRole("status").textContent).toBe(metin("vitrin.favori.yukleniyor"));
    expect(screen.queryByTestId("bos")).toBeNull();
  });

  // Kart 0146 (kullanıcı kararı): çerezsiz açılan sayfa iskeleti beklemeden boş hâli gösterir.
  it("çerezde ürün yokken boş hâl durum bilinmeden görünür; hesapta favori çıkarsa sayfa yenilenir", async () => {
    hesap(true, [a]);
    ciz([], []);
    expect(screen.getByTestId("bos")).toBeDefined();
    expect(screen.queryByRole("status")).toBeNull();
    await bekle();
    expect(yenile).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("bos")).toBeNull();
  });

  it("tarayıcıdaki sırayla, yalnız kartı olan ürünler görünür ve sayılır; bilgi şeridi görünür", async () => {
    localStorage.setItem(favoriDepoAnahtari, JSON.stringify([c, a, b]));
    hesap(false);
    // b sunucuda denetlendi ama kartı yok (taslak ya da silinmiş).
    ciz([a, b, c], [a, c]);
    await bekle();
    expect(kartlar()).toEqual([c, a]);
    expect(screen.getByRole("heading", { level: 1 }).parentElement?.textContent).toContain(
      doldur(metin("vitrin.favori.sayi"), { sayi: "2" }),
    );
    expect(screen.getByTestId("cihazda")).toBeDefined();
    expect(yenile).not.toHaveBeenCalled();
  });

  it("denetlenmemiş ürün varsa sayfa bir kez yenilenir", async () => {
    hesap(true, [a, b]);
    const { rerender } = ciz([a], [a]);
    await bekle();
    expect(yenile).toHaveBeenCalledTimes(1);
    expect(screen.queryAllByRole("listitem")).toEqual([]);
    // Çerez yazılamadıysa sunucu yine yalnız a'yı denetler: ikinci kez yenilenmez, a görünür.
    rerender(
      <MetinSaglayici dil="tr">
        <FavoriSaglayici ayarlar={{ kip: "sorulur", sinir: 100 }}>
          <FavoriListesi
            baslik="Favorilerim"
            denetlenenler={[a]}
            kartlar={[{ kimlik: a, kart: <span data-kart={a} /> }]}
            izgara=""
            cihazdaBilgisi={<p data-testid="cihazda" />}
            bosHal={<p data-testid="bos" />}
          />
        </FavoriSaglayici>
      </MetinSaglayici>,
    );
    await bekle();
    expect(yenile).toHaveBeenCalledTimes(1);
    expect(kartlar()).toEqual([a]);
    // Girişli müşteride "bu cihazda" bilgisi yok.
    expect(screen.queryByTestId("cihazda")).toBeNull();
  });

  it("liste boşsa boş hâl, okunamazsa hata görünür", async () => {
    hesap(false);
    ciz([], []);
    await bekle();
    expect(screen.getByTestId("bos")).toBeDefined();
    cleanup();
    vi.restoreAllMocks();
    hesapDurumunuSifirla();
    favoriDurumunuSifirla();
    hesap("hata");
    ciz([], []);
    await bekle();
    expect(screen.getByRole("alert").textContent).toContain(metin("vitrin.favori.hata"));
    expect(screen.queryByTestId("bos")).toBeNull();
  });

  it("ilk açılışta çerez durumda olmayan ürünü taşıyorsa (eski oturum) sayfa bir kez yenilenir", async () => {
    hesap(false);
    ciz([a, b], [a, b]);
    await bekle();
    expect(yenile).toHaveBeenCalledTimes(1);
    expect(screen.queryAllByRole("listitem")).toEqual([]);
  });

  it("görünmeyen ürün üye olmayan müşterinin listesinden atılır", async () => {
    localStorage.setItem(favoriDepoAnahtari, JSON.stringify([a, b]));
    hesap(false);
    ciz([a, b], [a]);
    await bekle();
    expect(JSON.parse(localStorage.getItem(favoriDepoAnahtari) ?? "[]")).toEqual([a]);
    expect(kartlar()).toEqual([a]);
  });

  it("çıkarılan kartın yerine odak sonraki kartın düğmesine, liste boşalınca boş hâle geçer", async () => {
    localStorage.setItem(favoriDepoAnahtari, JSON.stringify([a, b]));
    hesap(false);
    dugmeliCiz([a, b]);
    await bekle();
    const ilk = screen.getAllByRole("button", { pressed: true })[0];
    ilk?.focus();
    await act(async () => {
      ilk?.click();
    });
    const kalan = screen.getByRole("button", { pressed: true });
    expect(document.activeElement).toBe(kalan);
    await act(async () => {
      kalan.click();
    });
    expect(document.activeElement).toBe(screen.getByTestId("bos"));
  });
});
