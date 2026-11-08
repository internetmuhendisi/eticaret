// Fiyat servisi gerçek veritabanıyla (kart 0080, karar 0066): indirimin gece yarısı sınırı sitenin
// saat diliminde, her değişikliğin geçmişte bir satır olması, geçmişin değiştirilememesi, kuralların
// serviste ve veritabanında reddi, değişiklik kaydı ve onunla birlikte geri alınma, aynı anda gelen
// değişikliklerin sırası, silinmiş ürün, para birimi uyuşmazlığı ve iki sitenin ayrı kalması.
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { urunBirimleri, urunler as urunTablosu } from "../../urun/model.ts";
import { urunServisi } from "../../urun/servis.ts";
import { birimFiyatlari, fiyatGecmisi } from "../model.ts";
import type { FiyatGirdisi } from "../semalar.ts";
import { type FiyatAyarlari, fiyatServisi } from "../servis.ts";

const istanbul: FiyatAyarlari = { saatDilimi: "Europe/Istanbul", paraBirimi: "TRY" };
const servis = fiyatServisi(() => istanbul);
const urunler = urunServisi(() => istanbul.saatDilimi);

const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const silinecekler: (() => Promise<void>)[] = [];
const siteAc = async (): Promise<Veritabani> => {
  const site = await denemeSitesiAc("fiyat");
  silinecekler.push(site.sil);
  return site.vt;
};
afterEach(async () => {
  await Promise.all(silinecekler.splice(0).map((sil) => sil()));
});

// Yeni ürün ve tek satılabilir biriminin kimliği.
const birimAc = async (vt: Veritabani) => {
  const urun = await urunler.urunEkle(vt, yonetici(), { ad: "Deneme ürünü", vergiSinifi: null });
  const birim = (await urunler.urunuOku(vt, urun))?.birimler[0]?.kimlik;
  if (birim === undefined) throw new Error("Birim yok.");
  return { urun, birim };
};

const hatasi = async (is: Promise<unknown>) => {
  const hata = await is.then(
    () => undefined,
    (yakalanan: unknown) => yakalanan,
  );
  if (!(hata instanceof BilinenHata)) throw new Error(`Bilinen hata beklenirdi: ${String(hata)}`);
  return { kod: hata.kod, ayrinti: hata.ayrinti };
};

const gecmis = (vt: Veritabani, birim: string) =>
  vt.select().from(fiyatGecmisi).where(eq(fiyatGecmisi.birim_kimligi, birim));
const kayitlar = (vt: Veritabani, birim: string) =>
  vt
    .select()
    .from(degisiklikKayitlari)
    .where(eq(degisiklikKayitlari.kayit_kimligi, birim))
    .orderBy(degisiklikKayitlari.zaman);
const once = (an: string) => new Date(new Date(an).getTime() - 1);
const tutari = async (vt: Veritabani, birim: string, an: Date, s = servis) =>
  (await s.gecerliFiyatlar(vt, [birim], an)).get(birim)?.tutar;

const indirim: FiyatGirdisi = {
  satisFiyati: 10_000,
  indirimliFiyat: 7_500,
  indirimBaslangici: "2026-11-10T00:00",
  indirimBitisi: "2026-11-16T00:00",
};

describe("geçerli fiyat sitenin saat diliminde", () => {
  it("indirim yerel gece yarısında başlar ve biter", async () => {
    const vt = await siteAc();
    const { birim } = await birimAc(vt);
    await servis.fiyatYaz(vt, yonetici(), birim, indirim);
    // İstanbul UTC+3: yerel 10 Kasım 00:00, UTC'de 9 Kasım 21:00'dir.
    expect(await tutari(vt, birim, once("2026-11-09T21:00:00Z"))).toBe(10_000);
    expect(await tutari(vt, birim, new Date("2026-11-09T21:00:00Z"))).toBe(7_500);
    expect(await tutari(vt, birim, once("2026-11-15T21:00:00Z"))).toBe(7_500);
    expect(await tutari(vt, birim, new Date("2026-11-15T21:00:00Z"))).toBe(10_000);
    const gecerli = (await servis.gecerliFiyatlar(vt, [birim], new Date("2026-11-12T00:00Z"))).get(
      birim,
    );
    expect(gecerli).toEqual({
      tutar: 7_500,
      indirimde: true,
      paraBirimi: "TRY",
      satisFiyati: 10_000,
    });
  });

  it("aynı yerel saat başka saat diliminde başka andır", async () => {
    const vt = await siteAc();
    const { birim } = await birimAc(vt);
    const newYork = fiyatServisi(() => ({ saatDilimi: "America/New_York", paraBirimi: "TRY" }));
    await newYork.fiyatYaz(vt, yonetici(), birim, indirim);
    // New York 10 Kasım'da UTC-5: yerel gece yarısı 05:00 UTC.
    expect(await tutari(vt, birim, new Date("2026-11-10T04:59:59.999Z"), newYork)).toBe(10_000);
    expect(await tutari(vt, birim, new Date("2026-11-10T05:00:00Z"), newYork)).toBe(7_500);
    const okunan = await servis.fiyatOku(vt, birim);
    expect(okunan?.indirimBaslangici?.toISOString()).toBe("2026-11-10T05:00:00.000Z");
    expect(okunan?.indirimBitisi?.toISOString()).toBe("2026-11-16T05:00:00.000Z");
  });

  it("yaz saatine geçişte yaşanmayan saat reddedilir", async () => {
    const vt = await siteAc();
    const { birim } = await birimAc(vt);
    const berlin = fiyatServisi(() => ({ saatDilimi: "Europe/Berlin", paraBirimi: "EUR" }));
    expect(
      await hatasi(
        berlin.fiyatYaz(vt, yonetici(), birim, {
          ...indirim,
          indirimBaslangici: "2026-03-29T02:30",
        }),
      ),
    ).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "indirimBaslangici", kod: "indirim-zamani-gecersiz" }],
    });
    expect(await servis.fiyatOku(vt, birim)).toBeUndefined();
  });

  it("fiyatı olmayan birimin geçerli fiyatı yok", async () => {
    const vt = await siteAc();
    const { birim } = await birimAc(vt);
    expect(await servis.fiyatOku(vt, birim)).toBeUndefined();
    expect((await servis.gecerliFiyatlar(vt, [birim])).size).toBe(0);
  });

  it("birimlerin fiyatları tek sorguyla gelir", async () => {
    const vt = await siteAc();
    const birimler = await Promise.all([birimAc(vt), birimAc(vt), birimAc(vt)]);
    for (const [sira, { birim }] of birimler.entries()) {
      await servis.fiyatYaz(vt, yonetici(), birim, { satisFiyati: 1000 * (sira + 1) });
    }
    const sorgu = vi.spyOn(vt.$client, "query");
    const sonuc = await servis.gecerliFiyatlar(
      vt,
      birimler.map((b) => b.birim),
    );
    expect(sorgu).toHaveBeenCalledTimes(1);
    sorgu.mockRestore();
    expect(birimler.map((b) => sonuc.get(b.birim)?.tutar)).toEqual([1000, 2000, 3000]);
  });
});

describe("fiyat geçmişi", () => {
  it("her değişiklik geçmişte bir satır, aynı kalan fiyat hiçbir yere yazılmaz", async () => {
    const vt = await siteAc();
    const { birim } = await birimAc(vt);
    const kim = yonetici();
    await servis.fiyatYaz(vt, kim, birim, { satisFiyati: 10_000 });
    await servis.fiyatYaz(vt, kim, birim, indirim);
    await servis.fiyatYaz(vt, kim, birim, indirim);
    // İndirimi kaldırmak indirimli fiyatı göndermemektir.
    await servis.fiyatYaz(vt, kim, birim, { satisFiyati: 12_000 });
    const satirlar = await servis.fiyatGecmisiniOku(vt, birim);
    expect(satirlar.map((s) => [s.satisFiyati, s.indirimliFiyat])).toEqual([
      [12_000, null],
      [10_000, 7_500],
      [10_000, null],
    ]);
    expect(satirlar.every((s) => s.paraBirimi === "TRY")).toBe(true);
    expect(satirlar[1]?.indirimBaslangici?.toISOString()).toBe("2026-11-09T21:00:00.000Z");
    // Sonraki sayfa: verilen andan öncekiler.
    const ikinci = satirlar[1];
    if (ikinci === undefined) throw new Error("Satır yok.");
    const sonraki = await servis.fiyatGecmisiniOku(vt, birim, { once: ikinci.zaman, sinir: 5 });
    expect(sonraki.map((s) => s.indirimliFiyat)).toEqual([null]);
    expect(sonraki[0]?.satisFiyati).toBe(10_000);

    const kayit = await kayitlar(vt, birim);
    expect(kayit.map((k) => [k.islem, k.kayit_turu, k.kim_kimligi])).toEqual([
      ["fiyat.degisti", "fiyat", kim.tur === "yonetici" ? kim.kimlik : null],
      ["fiyat.degisti", "fiyat", kim.tur === "yonetici" ? kim.kimlik : null],
      ["fiyat.degisti", "fiyat", kim.tur === "yonetici" ? kim.kimlik : null],
    ]);
    expect(kayit[0]?.eski_deger).toBeNull();
    expect(kayit[0]?.yeni_deger).toEqual({ satisFiyati: 10_000, paraBirimi: "TRY" });
    expect(kayit[1]?.yeni_deger).toEqual({
      satisFiyati: 10_000,
      indirimliFiyat: 7_500,
      indirimBaslangici: "2026-11-09T21:00:00.000Z",
      indirimBitisi: "2026-11-15T21:00:00.000Z",
      paraBirimi: "TRY",
    });
    expect(kayit[2]?.eski_deger).toEqual(kayit[1]?.yeni_deger);
    expect(kayit[2]?.yeni_deger).toEqual({ satisFiyati: 12_000, paraBirimi: "TRY" });
  });

  it("geçmiş güncellenemez, silinemez, boşaltılamaz", async () => {
    const vt = await siteAc();
    const { birim } = await birimAc(vt);
    await servis.fiyatYaz(vt, yonetici(), birim, { satisFiyati: 10_000 });
    const kisitlama = { cause: { code: "23001" } };
    await expect(
      vt.update(fiyatGecmisi).set({ satis_fiyati: 1 }).where(eq(fiyatGecmisi.birim_kimligi, birim)),
    ).rejects.toMatchObject(kisitlama);
    await expect(
      vt.delete(fiyatGecmisi).where(eq(fiyatGecmisi.birim_kimligi, birim)),
    ).rejects.toMatchObject(kisitlama);
    await expect(vt.delete(fiyatGecmisi)).rejects.toMatchObject(kisitlama);
    await expect(vt.execute(sql`truncate fiyat_gecmisi`)).rejects.toMatchObject(kisitlama);
    expect((await gecmis(vt, birim)).map((s) => s.satis_fiyati)).toEqual([10_000]);
  });

  it("aynı anda gelen değişiklikler sırayla yazılır, son satır bugünkü fiyattır", async () => {
    const vt = await siteAc();
    const { birim } = await birimAc(vt);
    const tutarlar = Array.from({ length: 8 }, (_, i) => 1_000 * (i + 1));
    await Promise.all(
      tutarlar.map((satisFiyati) => servis.fiyatYaz(vt, yonetici(), birim, { satisFiyati })),
    );
    const satirlar = await servis.fiyatGecmisiniOku(vt, birim);
    expect(satirlar.map((s) => s.satisFiyati).toSorted((a, b) => a - b)).toEqual(tutarlar);
    expect(new Set(satirlar.map((s) => s.zaman.getTime())).size).toBe(8);
    expect((await servis.fiyatOku(vt, birim))?.satisFiyati).toBe(satirlar[0]?.satisFiyati);
    // Değişiklik kaydı da bir zincir kurar: her kaydın eskisi bir öncekinin yenisidir.
    const kayit = await vt
      .select()
      .from(degisiklikKayitlari)
      .where(eq(degisiklikKayitlari.kayit_kimligi, birim));
    expect(kayit.length).toBe(8);
    const sirali = satirlar.toReversed().map((s) => s.satisFiyati);
    const zincir = new Map(
      kayit.map((k) => [
        (k.eski_deger as { satisFiyati?: number } | null)?.satisFiyati ?? null,
        (k.yeni_deger as { satisFiyati: number }).satisFiyati,
      ]),
    );
    let onceki: number | null = null;
    for (const tutar of sirali) {
      expect(zincir.get(onceki)).toBe(tutar);
      onceki = tutar;
    }
  });

  it("kayıt yazılamazsa fiyat ve geçmiş de geri alınır", async () => {
    const vt = await siteAc();
    const { birim } = await birimAc(vt);
    await servis.fiyatYaz(vt, yonetici(), birim, { satisFiyati: 10_000 });
    // Kimliği UUID olmayan kişi kayıt satırını düşürür; bu, fiyat ve geçmiş yazıldıktan sonra olur.
    const yanlisKisi = { tur: "yonetici", kimlik: "uuid-degil" } as const;
    await expect(servis.fiyatYaz(vt, yanlisKisi, birim, { satisFiyati: 20_000 })).rejects.toThrow();
    expect((await servis.fiyatOku(vt, birim))?.satisFiyati).toBe(10_000);
    expect((await gecmis(vt, birim)).length).toBe(1);
  });
});

describe("kurallar", () => {
  it.each([
    [
      "satış fiyatına eşit indirim",
      { satisFiyati: 1000, indirimliFiyat: 1000 },
      "indirimliFiyat",
      "indirim-buyuk",
    ],
    [
      "satış fiyatından büyük indirim",
      { satisFiyati: 1000, indirimliFiyat: 1001 },
      "indirimliFiyat",
      "indirim-buyuk",
    ],
    ["sıfır indirim", { satisFiyati: 1000, indirimliFiyat: 0 }, "indirimliFiyat", "indirim-sifir"],
    ["eksi satış fiyatı", { satisFiyati: -1 }, "satisFiyati", "tutar-bicimi"],
    ["küsuratlı tutar", { satisFiyati: 10.5 }, "satisFiyati", "tutar-bicimi"],
    [
      "güvenli sınırı aşan tutar",
      { satisFiyati: Number.MAX_SAFE_INTEGER + 1 },
      "satisFiyati",
      "tutar-bicimi",
    ],
    [
      "indirimsiz başlangıç",
      { satisFiyati: 1000, indirimBaslangici: "2026-11-10T00:00" },
      "indirimBaslangici",
      "indirim-zamani-indirimsiz",
    ],
    [
      "indirimsiz bitiş",
      { satisFiyati: 1000, indirimBitisi: "2026-11-10T00:00" },
      "indirimBitisi",
      "indirim-zamani-indirimsiz",
    ],
    [
      "başlangıca eşit bitiş",
      { ...indirim, indirimBitisi: "2026-11-10T00:00" },
      "indirimBitisi",
      "indirim-sirasi",
    ],
    [
      "başlangıçtan önce bitiş",
      { ...indirim, indirimBitisi: "2026-11-09T23:59" },
      "indirimBitisi",
      "indirim-sirasi",
    ],
    [
      "biçimsiz zaman",
      { ...indirim, indirimBaslangici: "10.11.2026" },
      "indirimBaslangici",
      "indirim-zamani-bicimi",
    ],
    [
      "takvimde olmayan gün",
      { ...indirim, indirimBaslangici: "2026-02-30T00:00" },
      "indirimBaslangici",
      "indirim-zamani-gecersiz",
    ],
  ] as const)("%s reddedilir, hiçbir şey yazılmaz", async (_ad, girdi, alan, kod) => {
    const vt = await siteAc();
    const { birim } = await birimAc(vt);
    expect(await hatasi(servis.fiyatYaz(vt, yonetici(), birim, girdi))).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan, kod }],
    });
    expect(await servis.fiyatOku(vt, birim)).toBeUndefined();
    expect((await gecmis(vt, birim)).length).toBe(0);
    expect((await kayitlar(vt, birim)).length).toBe(0);
  });

  it("ücretsiz ürün: satış fiyatı sıfır olabilir", async () => {
    const vt = await siteAc();
    const { birim } = await birimAc(vt);
    await servis.fiyatYaz(vt, yonetici(), birim, { satisFiyati: 0 });
    expect(await tutari(vt, birim, new Date())).toBe(0);
  });

  it("veritabanı da kuralı çiğneyen fiyatı reddeder", async () => {
    const vt = await siteAc();
    const { birim } = await birimAc(vt);
    const gecerli = { birim_kimligi: birim, satis_fiyati: 1000, para_birimi: "TRY" };
    const bozuklar = [
      { satis_fiyati: -1 },
      { indirimli_fiyat: 1000 },
      { indirimli_fiyat: 0 },
      { indirim_baslangici: new Date() },
      {
        indirimli_fiyat: 500,
        indirim_baslangici: new Date("2026-11-10T00:00Z"),
        indirim_bitisi: new Date("2026-11-10T00:00Z"),
      },
      { para_birimi: "try" },
    ];
    for (const bozuk of bozuklar) {
      for (const tablo of [birimFiyatlari, fiyatGecmisi]) {
        await expect(
          vt.insert(tablo).values({ ...gecerli, ...bozuk }),
          JSON.stringify(bozuk),
        ).rejects.toMatchObject({ cause: { code: "23514" } });
      }
    }
    await vt.insert(birimFiyatlari).values(gecerli);
  });
});

describe("birim", () => {
  it("silinmiş ürünün, olmayan ve bozuk kimlikli birimin fiyatı yazılmaz; eski fiyat okunur", async () => {
    const vt = await siteAc();
    const { urun, birim } = await birimAc(vt);
    await servis.fiyatYaz(vt, yonetici(), birim, { satisFiyati: 10_000 });
    await urunler.urunSil(vt, yonetici(), urun);
    for (const kimlik of [birim, randomUUID(), "kimlik-degil"]) {
      expect(
        await hatasi(servis.fiyatYaz(vt, yonetici(), kimlik, { satisFiyati: 1 })),
      ).toMatchObject({ kod: "bulunamadi" });
    }
    expect((await servis.fiyatOku(vt, birim))?.satisFiyati).toBe(10_000);
    expect(await servis.fiyatOku(vt, "kimlik-degil")).toBeUndefined();
    expect(await servis.fiyatGecmisiniOku(vt, "kimlik-degil")).toEqual([]);
  });

  it("ürünü ya da birimi tek başına silinmişse fiyat yazılmaz", async () => {
    // Bugün ürün silinince birimi de silinir; varyantlarda (kart 0085) birim tek başına silinebilir.
    // İki işaret ayrı ayrı denenir: servis ikisine de bakar.
    const vt = await siteAc();
    const yalnizUrun = await birimAc(vt);
    await vt
      .update(urunTablosu)
      .set({ silinme_zamani: new Date() })
      .where(eq(urunTablosu.kimlik, yalnizUrun.urun));
    const yalnizBirim = await birimAc(vt);
    await vt
      .update(urunBirimleri)
      .set({ silinme_zamani: new Date() })
      .where(eq(urunBirimleri.kimlik, yalnizBirim.birim));
    for (const { birim } of [yalnizUrun, yalnizBirim]) {
      expect(
        await hatasi(servis.fiyatYaz(vt, yonetici(), birim, { satisFiyati: 1 })),
      ).toMatchObject({ kod: "bulunamadi" });
      expect(await servis.fiyatOku(vt, birim)).toBeUndefined();
    }
  });

  it("para birimi ayarı değişince eski para birimindeki fiyat satılamaz", async () => {
    const vt = await siteAc();
    const { birim } = await birimAc(vt);
    await servis.fiyatYaz(vt, yonetici(), birim, { satisFiyati: 10_000 });
    const euro = fiyatServisi(() => ({ ...istanbul, paraBirimi: "EUR" }));
    expect((await euro.gecerliFiyatlar(vt, [birim])).size).toBe(0);
    // Yeniden girilen fiyat yeni para birimiyle yazılır.
    await euro.fiyatYaz(vt, yonetici(), birim, { satisFiyati: 10_000 });
    expect((await euro.gecerliFiyatlar(vt, [birim])).get(birim)?.paraBirimi).toBe("EUR");
    expect((await gecmis(vt, birim)).map((s) => s.para_birimi).toSorted()).toEqual(["EUR", "TRY"]);
  });
});

describe("iki site", () => {
  it("bir sitenin fiyatı ötekinde görünmez, değiştirilemez", async () => {
    const [a, b] = await Promise.all([siteAc(), siteAc()]);
    const { birim } = await birimAc(a);
    await servis.fiyatYaz(a, yonetici(), birim, { satisFiyati: 10_000 });
    expect(await servis.fiyatOku(b, birim)).toBeUndefined();
    expect(await servis.fiyatGecmisiniOku(b, birim)).toEqual([]);
    expect((await b.select().from(fiyatGecmisi)).length).toBe(0);
    expect(await hatasi(servis.fiyatYaz(b, yonetici(), birim, { satisFiyati: 1 }))).toMatchObject({
      kod: "bulunamadi",
    });
    expect((await servis.fiyatOku(a, birim))?.satisFiyati).toBe(10_000);
  });
});
