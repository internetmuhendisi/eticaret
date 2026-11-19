// @vitest-environment jsdom
// Vitrindeki favori durumu, düğmesi ve sayısı (kart 0140, karar 0110):
// - Hesap durumu beklenir, favori isteği ondan sonra gider; sayfada bütün düğmeler tek durumu paylaşır.
// - Girişsiz müşterinin listesi tarayıcının deposundadır, sunucuya istek gitmez; sınır tarayıcıda da geçerlidir.
// - Girişli müşteride liste hesaptandır; tarayıcıda liste varsa önce birleşir, sonra depodan silinir; sığmayanlar bir
//   kez söylenir. Değişiklik ekranda hemen görünür, istekler sırayla gider, olmazsa yalnız o ürün geri döner.
// - Hesap durumu bilinmiyorsa favori de bilinmiyordur: düğme hata söyler, depoya yazmaz.
// - Düğme durumunu aria-pressed ile söyler; favoriler sayfasında çıkarılan ürün "Geri al" ile eski yerine döner.
// - Geçerli liste favoriler sayfasının çerezine yazılır; çıkışta çerez silinir.
// - Katalogun örnek kipinde istek gitmez, depoya yazılmaz.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { favoriCerezi, favoriDepoAnahtari } from "../../kayitlar/favori.ts";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { doldur } from "../../moduller/eposta/sablon.ts";
import {
  FavoriDugmesi,
  FavoriSayfasiBaglami,
  FavoriSayisi,
  VitrinBildirimleri,
} from "../favori-dugmesi.tsx";
import { type FavoriAyarlari, FavoriSaglayici, favoriDurumunuSifirla } from "../favori-durumu.ts";
import { cikisYap, hesapDurumunuSifirla } from "../hesap-durumu.ts";

const bildirimler = vi.hoisted(
  () => [] as { tur: string; metin: string; eylem?: { etiket: string; tikla: () => void } }[],
);
vi.mock("../../../bilesenler/parcalar/bildirim", async (asil) => ({
  ...(await asil<object>()),
  bildirimGoster: (tur: string, metin: string, eylem?: { etiket: string; tikla: () => void }) => {
    bildirimler.push({ tur, metin, ...(eylem === undefined ? {} : { eylem }) });
  },
}));

const metin = metinOkuyucu("tr");
const uclar = {
  hesabim: "/kapi/herkese-acik/hesap-durumu",
  liste: "/kapi/musteri/favoriler",
  degistir: "/kapi/musteri/favori",
  birlestir: "/kapi/musteri/favori-birlestir",
  cikis: "/kapi/herkese-acik/musteri-cikis",
};
const [a, b, c] = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
];
const adlar: Record<string, string> = { [a]: "Kupa", [b]: "Mum", [c]: "Vazo" };

const yanit = (durum: number, govde: unknown = {}) =>
  new Response(JSON.stringify(govde), { status: durum });
const basarili = (veri: unknown) => yanit(200, { basarili: true, veri });
const hatali = (durum: number, kod: string, neden?: string) =>
  yanit(durum, {
    basarili: false,
    hata: { kod, ...(neden === undefined ? {} : { ayrinti: [{ alan: "urun", kod: neden }] }) },
  });
const girisli = () => basarili({ girisli: true, eposta: "m@ornek.test" });
const girissiz = () => basarili({ girisli: false });

type Istek = { adres: string; govde?: unknown };
// Uçlara giden istekleri sırasıyla kaydeder; cevabı adrese göre verir.
const ucuTaklitEt = (
  cevaplar: Partial<Record<keyof typeof uclar, (govde: unknown) => Response | Promise<Response>>>,
) => {
  const istekler: Istek[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (hedef, secenek) => {
    const adres = String(hedef);
    const govde = typeof secenek?.body === "string" ? JSON.parse(secenek.body) : undefined;
    istekler.push({ adres, ...(govde === undefined ? {} : { govde }) });
    const ad = (Object.keys(uclar) as (keyof typeof uclar)[]).find((k) => uclar[k] === adres);
    const cevap = ad === undefined ? undefined : cevaplar[ad];
    if (cevap === undefined) throw new Error(`beklenmeyen istek: ${adres}`);
    return cevap(govde);
  });
  return istekler;
};

const ciz = (
  // null: sağlayıcı yok (katalog).
  ayarlar: FavoriAyarlari | null = { kip: "sorulur", sinir: 100 },
  sarmal: (dugumler: ReactNode) => ReactNode = (d) => d,
) => {
  const icerik = (
    <>
      {[a, b, c].map((urun) => (
        <FavoriDugmesi key={urun} urun={urun} urunAdi={adlar[urun] ?? ""} />
      ))}
      <span data-testid="sayi">
        <FavoriSayisi ornekSayi={7} className="" />
      </span>
    </>
  );
  return render(
    <MetinSaglayici dil="tr">
      {ayarlar === null ? (
        sarmal(icerik)
      ) : (
        <FavoriSaglayici ayarlar={ayarlar}>{sarmal(icerik)}</FavoriSaglayici>
      )}
    </MetinSaglayici>,
  );
};

const dugme = (urun: string) =>
  screen.getByRole("button", {
    name: new RegExp(`: ${adlar[urun]}$`),
  });
const basili = (urun: string) => dugme(urun).getAttribute("aria-pressed") === "true";
const bas = (urun: string) =>
  act(async () => {
    fireEvent.click(dugme(urun));
  });
const bekle = () => act(async () => {});
const yereldeki = () => JSON.parse(localStorage.getItem(favoriDepoAnahtari) ?? "[]") as string[];
const sayi = () => screen.getByTestId("sayi").textContent;

let cerezler: string[];
beforeEach(() => {
  hesapDurumunuSifirla();
  favoriDurumunuSifirla();
  localStorage.clear();
  bildirimler.length = 0;
  cerezler = [];
  vi.spyOn(document, "cookie", "set").mockImplementation((deger: string) => {
    cerezler.push(deger);
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("girişsiz müşteri", () => {
  it("liste tarayıcının deposundadır; sunucuya yalnız hesap sorusu gider", async () => {
    localStorage.setItem(favoriDepoAnahtari, JSON.stringify([b]));
    const istekler = ucuTaklitEt({ hesabim: girissiz });
    ciz();
    await bekle();
    expect(basili(b)).toBe(true);
    expect(basili(a)).toBe(false);
    await bas(a);
    expect(basili(a)).toBe(true);
    expect(yereldeki()).toEqual([a, b]);
    expect(sayi()).toContain("2");
    await bas(b);
    expect(yereldeki()).toEqual([a]);
    expect(istekler.map((istek) => istek.adres)).toEqual([uclar.hesabim]);
    // Geçerli liste yalnız favoriler sayfasının yoluna giden çereze yazılır.
    expect(cerezler.at(-1)).toMatch(
      new RegExp(`^${favoriCerezi.ad}=${a}; Path=${favoriCerezi.yol}; SameSite=Lax`),
    );
  });

  it("düğme durumunu ve adını söyler, eklenince ve çıkarınca bildirim verir", async () => {
    ucuTaklitEt({ hesabim: girissiz });
    ciz();
    await bekle();
    expect(dugme(a).getAttribute("aria-label")).toBe(
      doldur(metin("vitrin.urunKarti.favoriyeEkle"), { urun: "Kupa" }),
    );
    expect(dugme(a).getAttribute("aria-pressed")).toBe("false");
    await bas(a);
    expect(dugme(a).getAttribute("aria-label")).toBe(
      doldur(metin("vitrin.urunKarti.favoridenCikar"), { urun: "Kupa" }),
    );
    await bas(a);
    expect(bildirimler).toEqual([
      { tur: "basari", metin: doldur(metin("vitrin.favori.eklendi"), { urun: "Kupa" }) },
      { tur: "bilgi", metin: doldur(metin("vitrin.favori.cikarildi"), { urun: "Kupa" }) },
    ]);
  });

  it("sınır doluyken yeni ürün eklenmez, uyarı verilir", async () => {
    ucuTaklitEt({ hesabim: girissiz });
    ciz({ kip: "sorulur", sinir: 2 });
    await bekle();
    await bas(a);
    await bas(b);
    bildirimler.length = 0;
    await bas(c);
    expect(basili(c)).toBe(false);
    expect(yereldeki()).toEqual([b, a]);
    expect(bildirimler).toEqual([
      { tur: "uyari", metin: doldur(metin("vitrin.favori.sinir"), { sinir: "2" }) },
    ]);
  });

  it("depodaki bozuk değer, tekrar ve kimlik olmayan atılır", async () => {
    localStorage.setItem(favoriDepoAnahtari, JSON.stringify([b, "bozuk", 3, b.toUpperCase()]));
    ucuTaklitEt({ hesabim: girissiz });
    ciz();
    await bekle();
    expect(sayi()).toContain("1");
    localStorage.setItem(favoriDepoAnahtari, "{bozuk");
    favoriDurumunuSifirla();
    hesapDurumunuSifirla();
    cleanup();
    ciz();
    await bekle();
    expect(basili(b)).toBe(false);
  });

  it("başka sekmedeki değişiklik bu sekmeye geçer", async () => {
    ucuTaklitEt({ hesabim: girissiz });
    ciz();
    await bekle();
    localStorage.setItem(favoriDepoAnahtari, JSON.stringify([c]));
    await act(async () => {
      window.dispatchEvent(new StorageEvent("storage", { storageArea: localStorage }));
    });
    expect(basili(c)).toBe(true);
  });
});

describe("sekmeler", () => {
  it("başka sekmede giriş yapılıp liste hesaba geçince bu sekme hesabın listesine geçer", async () => {
    localStorage.setItem(favoriDepoAnahtari, JSON.stringify([a]));
    const hesapCevaplari = [girissiz, girisli];
    const istekler = ucuTaklitEt({
      hesabim: () => (hesapCevaplari.shift() ?? girisli)(),
      liste: () => basarili({ favoriler: [a, b] }),
    });
    ciz();
    await bekle();
    expect([basili(a), basili(b)]).toEqual([true, false]);
    // Öteki sekme birleştirip depoyu sildi.
    localStorage.removeItem(favoriDepoAnahtari);
    await act(async () => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: favoriDepoAnahtari, storageArea: localStorage }),
      );
    });
    await bekle();
    expect([basili(a), basili(b)]).toEqual([true, true]);
    expect(istekler.map((istek) => istek.adres)).toEqual([
      uclar.hesabim,
      uclar.hesabim,
      uclar.liste,
    ]);
    // Bundan sonraki ekleme hesaba gider, depoya yazılmaz.
    ucuTaklitEt({ degistir: () => basarili({ favoriler: [c, a, b] }) });
    await bas(c);
    expect(localStorage.getItem(favoriDepoAnahtari)).toBeNull();
  });

  it("başka anahtarın değişikliği hesabı yeniden sordurmaz", async () => {
    const istekler = ucuTaklitEt({ hesabim: girissiz });
    ciz();
    await bekle();
    await act(async () => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: "baska", storageArea: localStorage }),
      );
    });
    expect(istekler).toHaveLength(1);
  });
});

describe("girişli müşteri", () => {
  it("favori isteği hesap cevabından sonra gider; bütün düğmeler tek cevabı paylaşır", async () => {
    let hesapCevabi: (yanit: Response) => void = () => undefined;
    const istekler = ucuTaklitEt({
      hesabim: () => new Promise((bitti) => (hesapCevabi = bitti)),
      liste: () => basarili({ favoriler: [c, a] }),
    });
    ciz();
    await bekle();
    expect(istekler.map((istek) => istek.adres)).toEqual([uclar.hesabim]);
    await act(async () => hesapCevabi(girisli()));
    expect(istekler.map((istek) => istek.adres)).toEqual([uclar.hesabim, uclar.liste]);
    expect([basili(a), basili(b), basili(c)]).toEqual([true, false, true]);
    expect(sayi()).toContain("2");
    expect(cerezler.at(-1)).toMatch(new RegExp(`^${favoriCerezi.ad}=${c}\\.${a};`));
  });

  it("değişiklik hemen görünür, istekler sırayla gider", async () => {
    const bekleyenler: ((yanit: Response) => void)[] = [];
    const istekler = ucuTaklitEt({
      hesabim: girisli,
      liste: () => basarili({ favoriler: [] }),
      degistir: () => new Promise((bitti) => bekleyenler.push(bitti)),
    });
    ciz();
    await bekle();
    await bas(a);
    await bas(b);
    expect([basili(a), basili(b)]).toEqual([true, true]);
    // İkinci istek birincinin cevabını bekler.
    expect(istekler.filter((istek) => istek.adres === uclar.degistir)).toEqual([
      { adres: uclar.degistir, govde: { urun: a, favoride: true } },
    ]);
    await act(async () => bekleyenler[0]?.(basarili({ favoriler: [a] })));
    expect(istekler.filter((istek) => istek.adres === uclar.degistir)).toHaveLength(2);
    await act(async () => bekleyenler[1]?.(basarili({ favoriler: [b, a] })));
    expect([basili(a), basili(b)]).toEqual([true, true]);
    // Girişli müşterinin listesi depoya yazılmaz.
    expect(localStorage.getItem(favoriDepoAnahtari)).toBeNull();
  });

  it("olmayan değişiklikte yalnız o ürün geri döner ve nedeni söylenir", async () => {
    const cevaplar = [
      () => hatali(422, "is-kurali", "favori-siniri"),
      () => hatali(404, "bulunamadi", "urun-yok"),
      () => yanit(500, { basarili: false, hata: { kod: "beklenmeyen" } }),
      () => Promise.reject(new TypeError("ağ")),
    ];
    ucuTaklitEt({
      hesabim: girisli,
      liste: () => basarili({ favoriler: [b] }),
      degistir: () => (cevaplar.shift() ?? cevaplar[0] ?? (() => yanit(500)))(),
    });
    ciz({ kip: "sorulur", sinir: 5 });
    await bekle();
    for (const _ of [0, 1, 2]) await bas(a);
    await bas(b);
    expect([basili(a), basili(b)]).toEqual([false, true]);
    expect(bildirimler.map(({ tur, metin: yazi }) => [tur, yazi])).toEqual([
      ["uyari", doldur(metin("vitrin.favori.sinir"), { sinir: "5" })],
      ["uyari", metin("vitrin.favori.urunYok")],
      ["tehlike", metin("vitrin.favori.hata")],
      ["tehlike", metin("vitrin.favori.hata")],
    ]);
  });

  it("tarayıcıdaki liste önce birleşir, depodan silinir; sığmayanlar bir kez söylenir", async () => {
    localStorage.setItem(favoriDepoAnahtari, JSON.stringify([a, b]));
    const istekler = ucuTaklitEt({
      hesabim: girisli,
      birlestir: () => basarili({ favoriler: [a, c], sigmayan: 1 }),
    });
    ciz({ kip: "sorulur", sinir: 2 }, (d) => (
      <>
        {d}
        <VitrinBildirimleri />
      </>
    ));
    await bekle();
    expect(istekler).toEqual([
      { adres: uclar.hesabim },
      { adres: uclar.birlestir, govde: { urunler: [a, b] } },
    ]);
    expect(localStorage.getItem(favoriDepoAnahtari)).toBeNull();
    expect([basili(a), basili(b), basili(c)]).toEqual([true, false, true]);
    await bekle();
    expect(bildirimler).toEqual([
      {
        tur: "uyari",
        metin: doldur(metin("vitrin.favori.sigmayan"), { sayi: "1", sinir: "2" }),
      },
    ]);
  });

  it("birleşme olmazsa liste depoda kalır, favoriler bilinmiyor sayılır", async () => {
    localStorage.setItem(favoriDepoAnahtari, JSON.stringify([a]));
    ucuTaklitEt({ hesabim: girisli, birlestir: () => yanit(500) });
    ciz();
    await bekle();
    expect(yereldeki()).toEqual([a]);
    await bas(b);
    expect(basili(b)).toBe(false);
    expect(bildirimler.map(({ tur }) => tur)).toEqual(["tehlike"]);
  });
});

describe("hesap durumu bilinmiyor", () => {
  it("favoriler okunamazsa favoriler sayfasının çerezi silinir", async () => {
    ucuTaklitEt({ hesabim: () => yanit(500) });
    ciz();
    await bekle();
    expect(cerezler).toEqual([
      expect.stringMatching(new RegExp(`^${favoriCerezi.ad}=;.*Max-Age=0$`)),
    ]);
  });

  it("sunucu hatasında düğme hata söyler, depoya yazmaz, favori isteği gitmez", async () => {
    const istekler = ucuTaklitEt({ hesabim: () => yanit(500) });
    ciz();
    await bekle();
    await bas(a);
    expect(basili(a)).toBe(false);
    expect(localStorage.getItem(favoriDepoAnahtari)).toBeNull();
    expect(bildirimler.map(({ tur }) => tur)).toEqual(["tehlike"]);
    expect(istekler.map((istek) => istek.adres)).toEqual([uclar.hesabim]);
  });
});

describe("favoriler sayfası", () => {
  it("çıkarılan ürünün bildiriminde Geri al var; ürün eski yerine döner", async () => {
    localStorage.setItem(favoriDepoAnahtari, JSON.stringify([a, b, c]));
    ucuTaklitEt({ hesabim: girissiz });
    ciz({ kip: "sorulur", sinir: 100 }, (d) => (
      <FavoriSayfasiBaglami.Provider value>{d}</FavoriSayfasiBaglami.Provider>
    ));
    await bekle();
    await bas(b);
    expect(yereldeki()).toEqual([a, c]);
    const [bildirim] = bildirimler;
    expect(bildirim?.eylem?.etiket).toBe(metin("vitrin.favori.geriAl"));
    await act(async () => bildirim?.eylem?.tikla());
    expect(yereldeki()).toEqual([a, b, c]);
  });

  it("sayfa dışında çıkarılan ürünün bildiriminde eylem yok", async () => {
    localStorage.setItem(favoriDepoAnahtari, JSON.stringify([a]));
    ucuTaklitEt({ hesabim: girissiz });
    ciz();
    await bekle();
    await bas(a);
    expect(bildirimler[0]?.eylem).toBeUndefined();
  });
});

describe("örnek kip ve çıkış", () => {
  it("sağlayıcı yoksa (katalog) istek gitmez, depoya yazılmaz; sayı bağlamın örneğidir", async () => {
    const istek = vi.spyOn(globalThis, "fetch");
    ciz(null);
    await bekle();
    await bas(a);
    expect(basili(a)).toBe(true);
    expect(istek).not.toHaveBeenCalled();
    expect(localStorage.getItem(favoriDepoAnahtari)).toBeNull();
    expect(cerezler).toEqual([]);
    expect(sayi()).toContain("7");
  });

  it("çıkışta favoriler sayfasının çerezi silinir", async () => {
    ucuTaklitEt({ cikis: () => basarili({}) });
    // jsdom sayfa değiştirmez; çıkış başarılı döner.
    expect(await cikisYap()).toBe(true);
    expect(cerezler).toEqual([
      expect.stringMatching(
        new RegExp(`^${favoriCerezi.ad}=; Path=${favoriCerezi.yol};.*Max-Age=0$`),
      ),
    ]);
  });
});
