// @vitest-environment jsdom
// Sepet sayfasının boş hâli ve çerezi (kart 0218, karar 0136):
// - Depoya her yazımda ve durum kurulunca sepet sayfasının çerezi kalem sayısıyla eşitlenir; boş sepette silinir.
//   Çerez yalnız sayı taşır, yolu sepet sayfasıdır. Bozuk çerez boş sepettir.
// - Çerezde kalem yoksa sunucu boş hâli çizer (iskelet yok), varsa iskeleti. Sayfa bağlanırken uyuşmazlık uyarısı yok;
//   çerez silinip depo doluysa boş hâlden iskelete, sonra satırlara geçilir.
import { resolve } from "node:path";
import { act, cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { sepetCerezi, sepetDepoAnahtari, sepetSinirlari } from "../../../kayitlar/sepet.ts";
import { MetinSaglayici } from "../../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../../metinler/metin.ts";
import { cerezdekiSayi } from "../depo.ts";
import {
  type SepetAyarlari,
  SepetSaglayici,
  sepetDurumunuSifirla,
  sepeteEkle,
  sepettenCikar,
} from "../durum.ts";
import { SepetSayfasiIcerigi } from "../sepet-gorunumu.tsx";
import { SepetSayfasi } from "../sepet-sayfasi.tsx";

const { cerezler } = vi.hoisted(() => ({ cerezler: new Map<string, string>() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (ad: string) => {
      const value = cerezler.get(ad);
      return value === undefined ? undefined : { value };
    },
  }),
}));

const metin = metinOkuyucu("tr");
const [a, b] = ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"];
const sorulur: SepetAyarlari = { kip: "sorulur", sepeteEkleyince: "yan-pencere" };

const sar = (icerik: ReactNode) => (
  <MetinSaglayici dil="tr">
    <SepetSaglayici ayarlar={sorulur}>{icerik}</SepetSaglayici>
  </MetinSaglayici>
);

// Çerez yalnız sepet sayfasının yoluna gider: tarayıcı onu yalnız o adreste gösterir.
const cerez = () =>
  document.cookie
    .split("; ")
    .find((parca) => parca.startsWith(`${sepetCerezi.ad}=`))
    ?.slice(sepetCerezi.ad.length + 1);

const cereziSil = () => {
  // biome-ignore lint/suspicious/noDocumentCookie: testin çerezi temizlemesi.
  document.cookie = `${sepetCerezi.ad}=; Path=${sepetCerezi.yol}; Max-Age=0`;
};

beforeAll(() => {
  (globalThis as Record<symbol, unknown>)[Symbol.for("cekirdek.calisanSite")] = siteKlasorunuOku(
    resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/gecerli"),
  );
});
beforeEach(() => {
  window.history.replaceState(null, "", sepetCerezi.yol);
  window.localStorage.clear();
  cereziSil();
  cerezler.clear();
});
afterEach(() => {
  cleanup();
  sepetDurumunuSifirla();
  vi.restoreAllMocks();
});

describe("sepet sayfasının çerezi", () => {
  it("depoya her yazımda kalem sayısıyla eşitlenir, boşalınca silinir; yalnız sepet sayfasının yolunda", () => {
    sepeteEkle(sorulur, a, 3);
    expect(cerez()).toBe("1");
    sepeteEkle(sorulur, b, 1);
    expect(cerez()).toBe("2");
    sepettenCikar(a);
    expect(cerez()).toBe("1");
    sepettenCikar(b);
    expect(cerez()).toBeUndefined();
    sepeteEkle(sorulur, a, 1);
    window.history.replaceState(null, "", "/");
    expect(cerez()).toBeUndefined();
  });

  it("durum kurulunca depodan eşitlenir: çerezi silinmiş dolu sepet ve sepetsiz kalan çerez", () => {
    window.localStorage.setItem(sepetDepoAnahtari, JSON.stringify([{ birim: a, adet: 1 }]));
    render(sar(<SepetSayfasiIcerigi />));
    expect(cerez()).toBe("1");
    cleanup();
    sepetDurumunuSifirla();
    window.localStorage.clear();
    // biome-ignore lint/suspicious/noDocumentCookie: sepetten önceki kalmış çerez.
    document.cookie = `${sepetCerezi.ad}=4; Path=${sepetCerezi.yol}`;
    render(sar(<SepetSayfasiIcerigi />));
    expect(cerez()).toBeUndefined();
  });

  it("bozuk, eksi, çok büyük ya da olmayan değer sınırlı sayıdır, sayı olmayan boştur", () => {
    expect(cerezdekiSayi(undefined)).toBe(0);
    expect(cerezdekiSayi("")).toBe(0);
    expect(cerezdekiSayi("-1")).toBe(0);
    expect(cerezdekiSayi("1.5")).toBe(0);
    expect(cerezdekiSayi("x")).toBe(0);
    expect(cerezdekiSayi("1234")).toBe(0);
    expect(cerezdekiSayi("3")).toBe(3);
    expect(cerezdekiSayi("999")).toBe(sepetSinirlari.kalemEnCok);
  });
});

describe("sepet sayfasının sunucudaki çizimi", () => {
  const sayfa = async () => renderToString(sar(await SepetSayfasi()));

  it("çerezde kalem yoksa boş hâl ve bağlantısı çizilir, iskelet yok", async () => {
    const html = await sayfa();
    expect(html).toContain(metin("vitrin.sepet.bosBaslik"));
    expect(html).toContain(metin("vitrin.sepet.alisveriseBasla"));
    expect(html).not.toContain('data-slot="iskelet"');
    cerezler.set(sepetCerezi.ad, "bozuk");
    expect(await sayfa()).toContain(metin("vitrin.sepet.bosBaslik"));
  });

  it("çerezde kalem varsa iskelet çizilir, boş hâl yok", async () => {
    cerezler.set(sepetCerezi.ad, "2");
    const html = await sayfa();
    expect(html).toContain('data-slot="iskelet"');
    expect(html).not.toContain(metin("vitrin.sepet.bosBaslik"));
  });
});

describe("sepet sayfasının bağlanması", () => {
  const kokler: (() => void)[] = [];
  afterEach(() => {
    for (const kaldir of kokler.splice(0)) act(kaldir);
  });
  const bagla = async (cerezdeBos: boolean) => {
    const kap = document.createElement("div");
    kap.innerHTML = renderToString(sar(<SepetSayfasiIcerigi cerezdeBos={cerezdeBos} />));
    document.body.append(kap);
    const kok = await act(async () =>
      hydrateRoot(kap, sar(<SepetSayfasiIcerigi cerezdeBos={cerezdeBos} />)),
    );
    kokler.push(() => {
      kok.unmount();
    });
    return kap;
  };

  it("boş sepette uyuşmazlık uyarısı yok, boş hâl yerinde kalır, istek gitmez", async () => {
    const hata = vi.spyOn(console, "error").mockImplementation(() => {});
    const istek = vi.spyOn(globalThis, "fetch");
    const kap = await bagla(true);
    expect(kap.textContent).toContain(metin("vitrin.sepet.bosBaslik"));
    expect(kap.querySelector('[data-slot="iskelet"]')).toBeNull();
    expect(hata).not.toHaveBeenCalled();
    expect(istek).not.toHaveBeenCalled();
  });

  it("çerez silinip depo doluysa boş hâlden iskelete, cevapla satırlara geçilir; uyarı yok", async () => {
    const hata = vi.spyOn(console, "error").mockImplementation(() => {});
    let coz: ((yanit: Response) => void) | undefined;
    const istek = vi.spyOn(globalThis, "fetch").mockImplementation(
      () =>
        new Promise((tamam) => {
          coz = tamam;
        }),
    );
    window.localStorage.setItem(sepetDepoAnahtari, JSON.stringify([{ birim: a, adet: 1 }]));
    const kap = await bagla(true);
    expect(kap.textContent).not.toContain(metin("vitrin.sepet.bosBaslik"));
    expect(kap.querySelector('[data-slot="iskelet"]')).not.toBeNull();
    await act(async () => {
      coz?.(
        new Response(
          JSON.stringify({
            basarili: true,
            veri: {
              satirlar: [
                {
                  birim: a,
                  istenenAdet: 1,
                  adet: 1,
                  enAz: 1,
                  enCok: 10,
                  satilabilir: true,
                  secim: [],
                  uyarilar: [],
                },
              ],
              adet: 1,
              gosterim: "vergi-dahil",
              kargo: "ucretsiz",
              vergiDokumu: [],
              yazili: { araToplam: "1", vergi: "0", toplam: "1" },
              odemeyeGecilebilir: true,
            },
          }),
        ),
      );
    });
    expect(kap.querySelectorAll('[data-slot="sepet-satiri"]')).toHaveLength(1);
    expect(istek).toHaveBeenCalledTimes(1);
    expect(hata).not.toHaveBeenCalled();
  });
});
