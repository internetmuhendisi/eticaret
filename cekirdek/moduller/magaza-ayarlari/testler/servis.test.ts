// Mağaza sahibinin ayarları gerçek veritabanıyla (kart 0069, karar 0055): başlangıç değeri bir kez
// yazılır ve sonra değişmez, aynı anda açılan süreçler iki kez yazmaz, değişiklik kaydı işle birlikte
// yazılır ve geri alınır, bozuk değer sessizce varsayılana dönmez, iki site birbirinin ayarını görmez.
// Servisin kendisi deneme şemasıyla, çekirdeğin gerçek şeması ve siteler en sondaki bölümlerde denenir.
import { randomUUID } from "node:crypto";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { ayarBilgileri, magazaAyarSemasi } from "../../../ayar-semasi/ayarlar.ts";
import { siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { hataIzlemeAraciniBagla, type IzlenenHata } from "../../../izleme/hata-katmani.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { baglan, type Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { magazaAyarlari } from "../model.ts";
import {
  baslangicYazari,
  magazaAyarlariServisi,
  magazaninAdi,
  siteninMagazaAyarlari,
} from "../servis.ts";

const denemeSemasi = z.strictObject({
  kapidaOdeme: z.boolean().default(false),
  iptalSuresiGun: z.int().min(1).default(3),
  secenekler: z.array(z.enum(["nakit", "kart"])).default(["nakit"]),
  bilgiMetni: z.string().min(1).optional(),
  kargo: z
    .strictObject({ ucret: z.int().min(0), not: z.string().min(1).optional() })
    .default({ ucret: 0 }),
  yanitMetni: z.string().min(1).optional(),
});
type DenemeAyarlari = z.output<typeof denemeSemasi>;
const ayarSayisi = Object.keys(denemeSemasi.shape).length;

// Site klasöründe yalnız kapıda ödeme yazılmış gibi: geri kalanı varsayılan.
const baslangic: DenemeAyarlari = denemeSemasi.parse({ kapidaOdeme: true });
const servis = magazaAyarlariServisi(denemeSemasi, () => baslangic);

const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const silinecekler: (() => Promise<void>)[] = [];
const siteAc = async (): Promise<Veritabani> => {
  const site = await denemeSitesiAc("magaza-ayari");
  silinecekler.push(site.sil);
  return site.vt;
};
afterEach(async () => {
  await Promise.all(silinecekler.splice(0).map((sil) => sil()));
});

const kayitlar = (vt: Veritabani) =>
  vt
    .select()
    .from(degisiklikKayitlari)
    .where(eq(degisiklikKayitlari.kayit_turu, "magaza-ayari"))
    .orderBy(degisiklikKayitlari.zaman);

const satirSayisi = async (vt: Veritabani) => (await vt.select().from(magazaAyarlari)).length;

describe("başlangıç değerleri", () => {
  it("ilk okumada her ayar başlangıç değeriyle, verilmeyen varsayılanla yazılır ve kayda girer", async () => {
    const vt = await siteAc();
    expect(await servis.oku(vt)).toEqual({
      kapidaOdeme: true,
      iptalSuresiGun: 3,
      secenekler: ["nakit"],
      kargo: { ucret: 0 },
    });
    expect(await satirSayisi(vt)).toBe(ayarSayisi);
    const yazilan = await kayitlar(vt);
    expect(yazilan).toHaveLength(ayarSayisi);
    for (const kayit of yazilan) {
      expect(kayit.islem).toBe("magaza-ayari.baslangic");
      expect(kayit.kim_turu).toBe("sistem");
      expect(kayit.kim_adi).toBe(baslangicYazari.tur === "sistem" ? baslangicYazari.ad : "");
      expect(kayit.eski_deger).toBeNull();
    }
    expect(yazilan.map((kayit) => kayit.yeni_deger)).toContainEqual({
      ayar: "bilgiMetni",
      deger: null,
    });
  });

  it("ikinci okuma hiçbir şey yazmaz", async () => {
    const vt = await siteAc();
    const ilk = await servis.oku(vt);
    expect(await servis.oku(vt)).toEqual(ilk);
    expect(await kayitlar(vt)).toHaveLength(ayarSayisi);
  });

  it("başlangıç dosyası sonradan değişse de yazılmış değer değişmez", async () => {
    const vt = await siteAc();
    await servis.oku(vt);
    const degismisDosya = denemeSemasi.parse({ kapidaOdeme: false, iptalSuresiGun: 9 });
    const sonraki = magazaAyarlariServisi(denemeSemasi, () => degismisDosya);
    expect(await sonraki.oku(vt)).toMatchObject({ kapidaOdeme: true, iptalSuresiGun: 3 });
    expect(await kayitlar(vt)).toHaveLength(ayarSayisi);
  });

  it("şemaya yeni ayar eklenince yalnız o yazılır, eskiler yerinde kalır", async () => {
    const vt = await siteAc();
    await servis.degistir(vt, yonetici(), { iptalSuresiGun: 5 });
    const genisSema = denemeSemasi.extend({ yeniAyar: z.boolean().default(true) });
    const genis = magazaAyarlariServisi(genisSema, () =>
      genisSema.parse({ kapidaOdeme: false, yeniAyar: false }),
    );
    expect(await genis.oku(vt)).toMatchObject({
      kapidaOdeme: true,
      iptalSuresiGun: 5,
      yeniAyar: false,
    });
    const baslangiclar = (await kayitlar(vt)).filter((k) => k.islem === "magaza-ayari.baslangic");
    expect(baslangiclar).toHaveLength(ayarSayisi + 1);
  });

  it("aynı anda açılan okumalar her ayarı bir kez yazar ve bir kez kaydeder", async () => {
    const vt = await siteAc();
    // Bağlantılar önceden açılır: yoksa açılış süresi okumaları sıraya sokar, yarış hiç olmaz.
    await Promise.all(Array.from({ length: 8 }, () => vt.execute(sql`select pg_sleep(0.05)`)));
    const sonuclar = await Promise.all(Array.from({ length: 8 }, () => servis.oku(vt)));
    for (const sonuc of sonuclar) expect(sonuc).toEqual(sonuclar[0]);
    expect(await satirSayisi(vt)).toBe(ayarSayisi);
    expect(await kayitlar(vt)).toHaveLength(ayarSayisi);
  });
});

describe("değiştirme", () => {
  it("yeni değeri yazar, eskisini ve yapanı kayda geçirir; aynı değer kayda girmez", async () => {
    const vt = await siteAc();
    const kim = yonetici();
    expect(await servis.degistir(vt, kim, { secenekler: ["nakit", "kart"] })).toMatchObject({
      secenekler: ["nakit", "kart"],
    });
    await servis.degistir(vt, kim, { secenekler: ["nakit", "kart"], kapidaOdeme: true });
    const degisenler = (await kayitlar(vt)).filter((k) => k.islem === "magaza-ayari.degisti");
    expect(degisenler).toHaveLength(1);
    expect(degisenler[0]).toMatchObject({
      kim_turu: "yonetici",
      kim_kimligi: kim.tur === "yonetici" ? kim.kimlik : "",
      eski_deger: { ayar: "secenekler", deger: ["nakit"] },
      yeni_deger: { ayar: "secenekler", deger: ["nakit", "kart"] },
    });
  });

  it("boş bırakılabilen ayar doldurulup yeniden boşaltılır", async () => {
    const vt = await siteAc();
    await servis.degistir(vt, yonetici(), { bilgiMetni: "Hafta sonu kargo çıkmaz." });
    expect((await servis.oku(vt)).bilgiMetni).toBe("Hafta sonu kargo çıkmaz.");
    await servis.degistir(vt, yonetici(), { bilgiMetni: undefined });
    expect((await servis.oku(vt)).bilgiMetni).toBeUndefined();
  });

  it("şemaya uymayan değer ve bilinmeyen ayar hiçbir şeyi değiştirmez", async () => {
    const vt = await siteAc();
    const once = await servis.oku(vt);
    await expect(
      servis.degistir(vt, yonetici(), { kapidaOdeme: false, iptalSuresiGun: 0 }),
    ).rejects.toThrow("iptalSuresiGun");
    await expect(
      servis.degistir(vt, yonetici(), { olmayan: 1 } as Partial<DenemeAyarlari>),
    ).rejects.toThrow("Bilinmeyen mağaza ayarı: olmayan");
    await expect(
      servis.degistir(vt, yonetici(), { constructor: 1 } as Partial<DenemeAyarlari>),
    ).rejects.toThrow("Bilinmeyen mağaza ayarı: constructor");
    expect(await servis.oku(vt)).toEqual(once);
    expect(await kayitlar(vt)).toHaveLength(ayarSayisi);
  });

  it("nesne ayarının boş bırakılan alanı düşer, değişiklik reddedilmez", async () => {
    const vt = await siteAc();
    await servis.degistir(vt, yonetici(), { kargo: { ucret: 50, not: undefined } });
    expect((await servis.oku(vt)).kargo).toEqual({ ucret: 50 });
  });

  it("aynı anda gelen değişiklikler sırayla çalışır, kayıttaki eski değerler zincir kurar", async () => {
    const vt = await siteAc();
    await servis.oku(vt);
    await Promise.all(Array.from({ length: 8 }, () => vt.execute(sql`select pg_sleep(0.05)`)));
    const yeniler = [4, 5, 6, 7, 8, 9, 10, 11];
    await Promise.all(
      yeniler.map((gun) => servis.degistir(vt, yonetici(), { iptalSuresiGun: gun })),
    );
    const degisenler = (await kayitlar(vt)).filter((k) => k.islem === "magaza-ayari.degisti");
    expect(degisenler).toHaveLength(yeniler.length);
    // Sırayla çalışan her değişiklik bir öncekinin yeni değerini eski değer olarak görür: eski
    // değerler başlangıçla birlikte, sonuncusu hariç yeni değerlerin hepsidir ve hiçbiri tekrar etmez.
    const eskiler = degisenler.map((k) => (k.eski_deger as { deger: number }).deger);
    const son = (await servis.oku(vt)).iptalSuresiGun;
    expect(eskiler.toSorted((a, b) => a - b)).toEqual(
      [3, ...yeniler.filter((gun) => gun !== son)].toSorted((a, b) => a - b),
    );
  });

  it("değişiklik ile kaydı aynı işlemdedir: sonraki bir adım düşerse önceki kayıt da geri alınır", async () => {
    const vt = await siteAc();
    await servis.oku(vt);
    // Ayarlar ada göre sırayla yazılır: iptalSuresiGun yazılıp kaydı düştükten sonra yanitMetni'nin
    // kaydı e-posta taşıdığı için reddedilir. Kayıt işlemin dışında yazılsaydı ilk kayıt kalırdı.
    await expect(
      servis.degistir(vt, yonetici(), { iptalSuresiGun: 9, yanitMetni: "bilgi@ornek.test" }),
    ).rejects.toThrow("Değişiklik kaydına");
    expect((await servis.oku(vt)).iptalSuresiGun).toBe(3);
    expect(await kayitlar(vt)).toHaveLength(ayarSayisi);
  });

  it("bütün şemaya konan kurala aykırı değişiklik yazılmaz", async () => {
    const vt = await siteAc();
    const kuralliSema = denemeSemasi.refine((a) => !a.kapidaOdeme || a.secenekler.length > 0, {
      message: "Kapıda ödeme açıkken en az bir seçenek olmalı.",
    });
    const kuralli = magazaAyarlariServisi(kuralliSema, () => baslangic);
    await kuralli.oku(vt);
    await expect(kuralli.degistir(vt, yonetici(), { secenekler: [] })).rejects.toThrow(
      "yeni hâli şemaya uymuyor",
    );
    expect((await kuralli.oku(vt)).secenekler).toEqual(["nakit"]);
    expect(await kayitlar(vt)).toHaveLength(ayarSayisi);
  });

  it("kayıt yazılamazsa değişiklik de geri alınır", async () => {
    const vt = await siteAc();
    await servis.oku(vt);
    // Değişiklik kaydı e-posta taşıyan değeri reddeder: iş aynı işlemde olduğu için yazılmaz.
    await expect(
      servis.degistir(vt, yonetici(), { kapidaOdeme: false, bilgiMetni: "bilgi@ornek.test" }),
    ).rejects.toThrow("Değişiklik kaydına");
    expect(await servis.oku(vt)).toMatchObject({ kapidaOdeme: true, bilgiMetni: undefined });
    expect(await kayitlar(vt)).toHaveLength(ayarSayisi);
  });
});

describe("bozuk değer", () => {
  it("şemaya uymayan kayıtlı değer hata verir, değeri hata metnine yazmaz", async () => {
    const vt = await siteAc();
    await servis.oku(vt);
    await vt
      .update(magazaAyarlari)
      .set({ deger: "gizli-deger" })
      .where(eq(magazaAyarlari.anahtar, "kapidaOdeme"));
    const hata = await servis.oku(vt).catch((yakalanan: Error) => yakalanan);
    expect(hata).toBeInstanceOf(Error);
    expect((hata as Error).message).toContain("kapidaOdeme");
    expect((hata as Error).message).not.toContain("gizli-deger");
  });
});

describe("iki site", () => {
  it("bir sitenin değişikliği ötekinin ayarını değiştirmez", async () => {
    const [birinci, ikinci] = await Promise.all([siteAc(), siteAc()]);
    await servis.degistir(birinci, yonetici(), { iptalSuresiGun: 7 });
    expect((await servis.oku(ikinci)).iptalSuresiGun).toBe(3);
    expect((await servis.oku(birinci)).iptalSuresiGun).toBe(7);
  });
});

describe("çekirdeğin şeması", () => {
  it("başlangıç değeri verilmeyen her mağaza ayarı boş başlar, her ayarın satırı yazılır", async () => {
    const vt = await siteAc();
    const gercek = magazaAyarlariServisi(magazaAyarSemasi, () => magazaAyarSemasi.parse({}));
    expect(await gercek.oku(vt)).toEqual(magazaAyarSemasi.parse({}));
    expect(await satirSayisi(vt)).toBe(Object.keys(magazaAyarSemasi.shape).length);
  });
});

describe("kayıtta gizli ayar", () => {
  it("işaretli ayarın değeri kayda yazılmaz, yalnız adı yazılır", async () => {
    const vt = await siteAc();
    const gizliAlan = z.string().min(1).optional();
    ayarBilgileri.add(gizliAlan, {
      aciklama: "ayar.aciklama.iletisimEpostasi",
      kimDegistirir: "magaza-sahibi",
      kayittaGizli: true,
    });
    const gizliSema = denemeSemasi.extend({ gizliMetin: gizliAlan });
    const gizliServis = magazaAyarlariServisi(gizliSema, () =>
      gizliSema.parse({ gizliMetin: "ilk-deger" }),
    );
    expect((await gizliServis.oku(vt)).gizliMetin).toBe("ilk-deger");
    // E-posta taşıyan değer gizli olmasaydı değişiklik kaydı onu reddederdi.
    await gizliServis.degistir(vt, yonetici(), { gizliMetin: "sahip@ornek.test" });
    expect((await gizliServis.oku(vt)).gizliMetin).toBe("sahip@ornek.test");
    const gizliKayitlar = (await kayitlar(vt)).filter(
      (k) => (k.yeni_deger as { ayar: string }).ayar === "gizliMetin",
    );
    expect(gizliKayitlar.map((k) => [k.islem, k.eski_deger, k.yeni_deger])).toEqual([
      ["magaza-ayari.baslangic", null, { ayar: "gizliMetin" }],
      ["magaza-ayari.degisti", { ayar: "gizliMetin" }, { ayar: "gizliMetin" }],
    ]);
    expect(JSON.stringify(await kayitlar(vt))).not.toMatch(/ilk-deger|sahip@ornek/);
  });
});

// Çekirdekte site adı geçmez (cekirdek/testler/site-adi-yok.test.ts): siteler klasörden okunur.
const sitelerKlasoru = join(import.meta.dirname, "../../../../siteler");
const siteler = readdirSync(sitelerKlasoru, { withFileTypes: true })
  .filter((girdi) => girdi.isDirectory())
  .map((girdi) => siteKlasorunuOku(join(sitelerKlasoru, girdi.name)));

describe("siteler/ altındaki her site", () => {
  it("en az bir site var", () => {
    expect(siteler.length).toBeGreaterThan(0);
  });

  for (const site of siteler) {
    it(`${site.kimlik.kodAdi}: bilgileri başlangıç dosyasından veritabanına yazılır ve oradan okunur`, async () => {
      const vt = await siteAc();
      const okunan = await siteninMagazaAyarlari(vt, site);
      expect(okunan).toEqual(site.baslangic);
      // Değer veritabanındadır: dosyadaki değer değişse de okunan değişmez.
      const degismis = { ...site, baslangic: { ...site.baslangic, magazaAdi: "Başka Ad" } };
      expect(await magazaninAdi(vt, degismis)).toBe(site.baslangic.magazaAdi);
      // Kişisel veri taşıyabilen değerler kayda girmez.
      const kayit = JSON.stringify(await kayitlar(vt));
      for (const gizli of [
        okunan.iletisimEpostasi,
        okunan.iletisimTelefonu,
        okunan.magazaAdresi?.adres,
      ]) {
        if (gizli !== undefined) expect(kayit).not.toContain(gizli);
      }
    });

    it(`${site.kimlik.kodAdi}: mağaza adı değişince yeni ad okunur`, async () => {
      const vt = await siteAc();
      const servisi = magazaAyarlariServisi(magazaAyarSemasi, () => site.baslangic);
      await servisi.degistir(vt, yonetici(), { magazaAdi: "Yeni Ad" });
      expect(await magazaninAdi(vt, site)).toBe("Yeni Ad");
    });
  }
});

describe("mağaza adı", () => {
  const [site] = siteler;
  if (site === undefined) throw new Error("Site yok.");
  let izlenenler: IzlenenHata[] = [];
  beforeEach(() => {
    izlenenler = [];
    hataIzlemeAraciniBagla((olay) => izlenenler.push(olay));
  });
  afterEach(() => {
    hataIzlemeAraciniBagla(undefined);
  });

  it("başka bir ayar bozuk olsa da ad okunur", async () => {
    const vt = await siteAc();
    await siteninMagazaAyarlari(vt, site);
    await vt
      .update(magazaAyarlari)
      .set({ deger: 123 })
      .where(eq(magazaAyarlari.anahtar, "iletisimTelefonu"));
    await expect(siteninMagazaAyarlari(vt, site)).rejects.toThrow("iletisimTelefonu");
    expect(await magazaninAdi(vt, site)).toBe(site.baslangic.magazaAdi);
    expect(izlenenler).toEqual([]);
  });

  it("adın kendisi bozuksa kimlikteki ad görünür ve hata kaydedilir", async () => {
    const vt = await siteAc();
    await siteninMagazaAyarlari(vt, site);
    await vt
      .update(magazaAyarlari)
      .set({ deger: 123 })
      .where(eq(magazaAyarlari.anahtar, "magazaAdi"));
    expect(await magazaninAdi(vt, site)).toBe(site.kimlik.gorunenAd);
    expect(izlenenler).toHaveLength(1);
    expect(JSON.stringify(izlenenler[0])).toContain("magaza-adi");
  });

  it("veritabanına ulaşılamazsa kimlikteki ad görünür ve hata kaydedilir", async () => {
    // Kimse dinlemeyen bir port: bağlantı hemen reddedilir.
    const ulasilamayan = baglan("postgres://127.0.0.1:1/yok");
    try {
      expect(await magazaninAdi(ulasilamayan, site)).toBe(site.kimlik.gorunenAd);
      expect(izlenenler).toHaveLength(1);
    } finally {
      await ulasilamayan.$client.end();
    }
  });

  it("ilk okumada adın başlangıç değeri yazılır", async () => {
    const vt = await siteAc();
    expect(await magazaninAdi(vt, site)).toBe(site.baslangic.magazaAdi);
    expect(await satirSayisi(vt)).toBe(Object.keys(magazaAyarSemasi.shape).length);
  });
});
