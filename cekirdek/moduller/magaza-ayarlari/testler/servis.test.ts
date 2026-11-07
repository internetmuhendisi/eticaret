// Mağaza sahibinin ayarları gerçek veritabanıyla (kart 0069, karar 0055): başlangıç değeri bir kez
// yazılır ve sonra değişmez, aynı anda açılan süreçler iki kez yazmaz, değişiklik kaydı işle birlikte
// yazılır ve geri alınır, bozuk değer sessizce varsayılana dönmez, iki site birbirinin ayarını görmez.
// Çekirdekte henüz mağaza sahibinin ayarı olmadığı için servis deneme şemasıyla kurulur.
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { magazaAyarSemasi } from "../../../ayar-semasi/ayarlar.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { magazaAyarlari } from "../model.ts";
import { baslangicYazari, magazaAyarlariServisi } from "../servis.ts";

const denemeSemasi = z.strictObject({
  kapidaOdeme: z.boolean().default(false),
  iptalSuresiGun: z.int().min(1).default(3),
  secenekler: z.array(z.enum(["nakit", "kart"])).default(["nakit"]),
  bilgiMetni: z.string().min(1).optional(),
});
type DenemeAyarlari = z.output<typeof denemeSemasi>;

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
    });
    expect(await satirSayisi(vt)).toBe(4);
    const yazilan = await kayitlar(vt);
    expect(yazilan).toHaveLength(4);
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
    expect(await kayitlar(vt)).toHaveLength(4);
  });

  it("başlangıç dosyası sonradan değişse de yazılmış değer değişmez", async () => {
    const vt = await siteAc();
    await servis.oku(vt);
    const degismisDosya = denemeSemasi.parse({ kapidaOdeme: false, iptalSuresiGun: 9 });
    const sonraki = magazaAyarlariServisi(denemeSemasi, () => degismisDosya);
    expect(await sonraki.oku(vt)).toMatchObject({ kapidaOdeme: true, iptalSuresiGun: 3 });
    expect(await kayitlar(vt)).toHaveLength(4);
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
    expect(baslangiclar).toHaveLength(5);
  });

  it("aynı anda açılan okumalar her ayarı bir kez yazar ve bir kez kaydeder", async () => {
    const vt = await siteAc();
    // Bağlantılar önceden açılır: yoksa açılış süresi okumaları sıraya sokar, yarış hiç olmaz.
    await Promise.all(Array.from({ length: 8 }, () => vt.execute(sql`select pg_sleep(0.05)`)));
    const sonuclar = await Promise.all(Array.from({ length: 8 }, () => servis.oku(vt)));
    for (const sonuc of sonuclar) expect(sonuc).toEqual(sonuclar[0]);
    expect(await satirSayisi(vt)).toBe(4);
    expect(await kayitlar(vt)).toHaveLength(4);
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
    expect(await servis.oku(vt)).toEqual(once);
    expect(await kayitlar(vt)).toHaveLength(4);
  });

  it("kayıt yazılamazsa değişiklik de geri alınır", async () => {
    const vt = await siteAc();
    await servis.oku(vt);
    // Değişiklik kaydı e-posta taşıyan değeri reddeder: iş aynı işlemde olduğu için yazılmaz.
    await expect(
      servis.degistir(vt, yonetici(), { kapidaOdeme: false, bilgiMetni: "bilgi@ornek.test" }),
    ).rejects.toThrow("Değişiklik kaydına");
    expect(await servis.oku(vt)).toMatchObject({ kapidaOdeme: true, bilgiMetni: undefined });
    expect(await kayitlar(vt)).toHaveLength(4);
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
  it("çalışan sitenin servisi bugünkü boş şemayla okur", async () => {
    const vt = await siteAc();
    const gercek = magazaAyarlariServisi(magazaAyarSemasi, () => magazaAyarSemasi.parse({}));
    expect(await gercek.oku(vt)).toEqual({});
    expect(await satirSayisi(vt)).toBe(0);
  });
});
