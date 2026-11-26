// Yerel ortam denemesinin posta kutusu araması (kart 0323): kutunun hata cevabı "ileti yok" sayılmaz, beklenen
// ileti süre dolana kadar yeniden aranır. Kutu sahte cevaplarla taklit edilir.
import { describe, expect, it } from "vitest";
import {
  postaAramaAraligiMs,
  postaBeklemeSuresiMs,
  postaIstegiSuresiMs,
  postaKutusunuBekle,
  postaKutusunuSor,
} from "../posta-kutusu.mts";

const kutu = "http://kutu.test";
const ileti = { ID: "a", Subject: "Deneme", From: { Address: "magaza@ornek.test" } };
const json = (veri: unknown, durum = 200) => new Response(JSON.stringify(veri), { status: durum });

// Sırayla verilen cevapları döndüren sahte kutu; sonuncusu tekrarlanır. Sorulan adresler kaydedilir.
const sahteKutu = (...cevaplar: (() => Response | Promise<Response>)[]) => {
  const sorulan: string[] = [];
  const sor = async (adres: string) => {
    sorulan.push(adres);
    const cevap = cevaplar[Math.min(sorulan.length, cevaplar.length) - 1];
    if (cevap === undefined) throw new Error("cevap yok");
    return cevap();
  };
  return { sor, sorulan };
};

describe("postaKutusunuSor", () => {
  it("alıcıyı tırnaklı to: aramasıyla sorar ve iletileri döner", async () => {
    const { sor, sorulan } = sahteKutu(() => json({ messages: [ileti] }));
    expect(await postaKutusunuSor(kutu, "a-1@ornek.test", sor)).toEqual({ iletiler: [ileti] });
    expect(sorulan).toEqual([
      `${kutu}/api/v1/search?query=${encodeURIComponent('to:"a-1@ornek.test"')}`,
    ]);
  });

  it("boş liste ileti yok demektir", async () => {
    const { sor } = sahteKutu(() => json({ messages: [] }));
    expect(await postaKutusunuSor(kutu, "a@ornek.test", sor)).toEqual({ iletiler: [] });
  });

  it.each([
    [
      "HTTP hatası",
      () => json({ Error: "database is locked" }, 500),
      /^HTTP 500: .*database is locked/,
    ],
    ["JSON olmayan gövde", () => new Response("<html>", { status: 200 }), /^JSON değil: <html>/],
    [
      "ileti listesi olmayan cevap",
      () => json({ Error: "kilitli" }),
      /^ileti listesi yok: .*kilitli/,
    ],
    ["null gövde", () => json(null), /^ileti listesi yok: null/],
  ])("%s ileti yok sayılmaz, nedeniyle döner", async (_ad, cevap, kalip) => {
    const { sor } = sahteKutu(cevap);
    const sonuc = await postaKutusunuSor(kutu, "a@ornek.test", sor);
    expect(sonuc).not.toHaveProperty("iletiler");
    expect(sonuc).toEqual({ hata: expect.stringMatching(kalip) });
  });

  it("bağlantı hatası nedeniyle döner", async () => {
    const sonuc = await postaKutusunuSor(kutu, "a@ornek.test", async () => {
      throw new Error("ECONNREFUSED");
    });
    expect(sonuc).toEqual({ hata: "bağlantı: ECONNREFUSED" });
  });
});

describe("postaKutusunuBekle", () => {
  const hizli = { aralikMs: 1, sureMs: 200 };

  it("ileti sonradan görünürse bekleyip bulur", async () => {
    const { sor, sorulan } = sahteKutu(
      () => json({ messages: [] }),
      () => json({ messages: [] }),
      () => json({ messages: [ileti] }),
    );
    expect(await postaKutusunuBekle(kutu, "a@ornek.test", { ...hizli, sor })).toEqual({
      iletiler: [ileti],
      tamam: true,
    });
    // Üç arama ve bulduktan sonra bir doğrulama araması.
    expect(sorulan).toHaveLength(4);
  });

  it("ilk iletinin arkasından gelen kopya da sayılır", async () => {
    const kopya = { ...ileti, ID: "kopya" };
    const { sor, sorulan } = sahteKutu(
      () => json({ messages: [ileti] }),
      () => json({ messages: [ileti, kopya] }),
    );
    expect(await postaKutusunuBekle(kutu, "a@ornek.test", { ...hizli, sor })).toEqual({
      iletiler: [ileti, kopya],
      tamam: true,
    });
    expect(sorulan).toHaveLength(2);
  });

  it("koşulun hatası koşul sağlanmadı sayılır ve nedeniyle döner", async () => {
    const { sor } = sahteKutu(() => json({ messages: [ileti] }));
    expect(
      await postaKutusunuBekle(kutu, "a@ornek.test", {
        ...hizli,
        sor,
        tamam: async () => {
          throw new Error("ileti okunamadı");
        },
      }),
    ).toEqual({ iletiler: [ileti], tamam: false, sonHata: "koşul: ileti okunamadı" });
  });

  it("cevap vermeyen kutu istek süresinde bırakılır", async () => {
    const asili = (_adres: string, sinyal: AbortSignal) =>
      new Promise<Response>((_coz, reddet) =>
        sinyal.addEventListener("abort", () => reddet(sinyal.reason), { once: true }),
      );
    const baslangic = Date.now();
    const sonuc = await postaKutusunuBekle(kutu, "a@ornek.test", {
      aralikMs: 1,
      sureMs: 50,
      istekSuresiMs: 50,
      sor: asili,
    });
    expect(Date.now() - baslangic).toBeLessThan(2000);
    expect(sonuc).toEqual({
      iletiler: [],
      tamam: false,
      sonHata: expect.stringMatching(/^bağlantı: .*(timed out|aborted|timeout)/i),
    });
  });

  it("varsayılanlar: 30 saniye bekleme, saniyede bir arama, istek başına 10 saniye", () => {
    expect([postaBeklemeSuresiMs, postaAramaAraligiMs, postaIstegiSuresiMs]).toEqual([
      30_000, 1000, 10_000,
    ]);
  });

  it("araya giren hata cevabından sonra bulunca hata taşımaz", async () => {
    const { sor } = sahteKutu(
      () => json({ Error: "database is locked" }, 500),
      () => json({ messages: [ileti] }),
    );
    expect(await postaKutusunuBekle(kutu, "a@ornek.test", { ...hizli, sor })).toEqual({
      iletiler: [ileti],
      tamam: true,
    });
  });

  it("süre dolunca son iletileri ve görülen son hatayı döner", async () => {
    const { sor } = sahteKutu(
      () => json({ Error: "database is locked" }, 500),
      () => json({ messages: [] }),
    );
    expect(await postaKutusunuBekle(kutu, "a@ornek.test", { ...hizli, sor })).toEqual({
      iletiler: [],
      tamam: false,
      sonHata: expect.stringMatching(/^HTTP 500/),
    });
  });

  it("süre bitince aramayı bırakır", async () => {
    const { sor, sorulan } = sahteKutu(() => json({ messages: [] }));
    const baslangic = Date.now();
    await postaKutusunuBekle(kutu, "a@ornek.test", { aralikMs: 20, sureMs: 100, sor });
    expect(Date.now() - baslangic).toBeLessThan(1000);
    expect(sorulan.length).toBeGreaterThan(1);
    expect(sorulan.length).toBeLessThanOrEqual(6);
  });

  it("koşul verilince koşul sağlanana kadar arar (async koşul)", async () => {
    const ikinci = { ...ileti, ID: "b" };
    const { sor } = sahteKutu(
      () => json({ messages: [ileti] }),
      () => json({ messages: [ileti, ikinci] }),
    );
    const sonuc = await postaKutusunuBekle(kutu, "a@ornek.test", {
      ...hizli,
      sor,
      tamam: async (iletiler) => iletiler.some(({ ID }) => ID === "b"),
    });
    expect(sonuc).toEqual({ iletiler: [ileti, ikinci], tamam: true });
  });
});
