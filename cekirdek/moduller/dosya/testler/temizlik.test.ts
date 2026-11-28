// Sitenin dosya temizliği (kart 0093, karar 0207), gerçek veritabanı ve klasörle.
import { existsSync, mkdtempSync, rmSync, unlinkSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq, sql } from "drizzle-orm";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dosyaTemizligiAyari } from "../../../kayitlar/dosya.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { dosyalar } from "../model.ts";
import { belgeKaydet, dosyaKaydet, dosyaSil, gorselKaydet } from "../servis.ts";
import { dosyaTemizligi } from "../temizlik.ts";

let site: Awaited<ReturnType<typeof denemeSitesiAc>>;
let vt: Veritabani;
let klasor: string;
const gunMs = 24 * 60 * 60 * 1000;
const simdi = new Date();

const png = (renk: string) =>
  sharp({ create: { width: 4, height: 4, channels: 3, background: renk } })
    .png()
    .toBuffer();

const belge = async (metin: string) => {
  const sonuc = await belgeKaydet(vt, Buffer.from(`%PDF-1.4 ${metin}`), klasor);
  if (!sonuc.tamam) throw new Error(sonuc.hata);
  return sonuc.dosya.kimlik;
};
const gorsel = async (renk: string) => {
  const sonuc = await dosyaKaydet(vt, await png(renk), klasor);
  if (!sonuc.tamam) throw new Error(sonuc.hata);
  return sonuc.dosya.kimlik;
};
const geriAl = (kimlik: string, alan: "olusturma_zamani" | "silinme_zamani", ms: number) =>
  vt
    .update(dosyalar)
    .set({ [alan]: new Date(simdi.getTime() - ms) })
    .where(eq(dosyalar.kimlik, kimlik));
const silinmeZamani = async (kimlik: string) =>
  (await vt.select().from(dosyalar).where(eq(dosyalar.kimlik, kimlik)))[0]?.silinme_zamani ?? null;
const temizle = () => dosyaTemizligi(vt, klasor, simdi);

beforeAll(async () => {
  site = await denemeSitesiAc("dosya-temizligi");
  vt = site.vt;
  klasor = mkdtempSync(join(tmpdir(), "dosya-temizligi-"));
}, 60_000);

afterAll(async () => {
  await site?.sil();
  rmSync(klasor, { recursive: true, force: true });
});

describe("dosya temizliği", () => {
  it("silinmiş işaretli dosya süresi dolunca diskten silinir, kaydı kalır; süresi dolmayan kalır", async () => {
    const eski = await gorsel("red");
    const yeni = await gorsel("blue");
    await dosyaSil(vt, eski);
    await dosyaSil(vt, yeni);
    await geriAl(eski, "silinme_zamani", (dosyaTemizligiAyari.kaliciSilmeGun + 1) * gunMs);
    await geriAl(yeni, "silinme_zamani", (dosyaTemizligiAyari.kaliciSilmeGun - 1) * gunMs);
    const sonuc = await temizle();
    expect(sonuc.kaliciSilinen).toBe(1);
    expect(existsSync(join(klasor, `${eski}.png`))).toBe(false);
    expect(existsSync(join(klasor, `${yeni}.png`))).toBe(true);
    expect(await silinmeZamani(eski)).not.toBeNull();
    // Bir daha çalışınca dosya zaten yoktur: hata vermez, eksik de sayılmaz (silinmiş işaretli).
    const ikinci = await temizle();
    expect(ikinci.kaliciSilinen).toBe(0);
    expect(ikinci.eksik).not.toContain(`${eski}.png`);
  });

  it("hiçbir kaydın kullanmadığı belge bir gün sonra işaretlenir; kullanılan ve yeni belge işaretlenmez", async () => {
    const sahipsiz = await belge("sahipsiz");
    const yeni = await belge("yeni");
    const bagli = await belge("bağlı");
    await geriAl(
      sahipsiz,
      "olusturma_zamani",
      (dosyaTemizligiAyari.sahipsizBelgeSaat + 1) * 3_600_000,
    );
    await geriAl(
      bagli,
      "olusturma_zamani",
      (dosyaTemizligiAyari.sahipsizBelgeSaat + 1) * 3_600_000,
    );
    // Dosyalara giden her yabancı anahtar sayılır: yeni bir tablo da kendiliğinden girer.
    await vt.execute(
      sql`create table deneme_belge_baglantisi (dosya uuid references dosyalar (kimlik))`,
    );
    await vt.execute(sql`insert into deneme_belge_baglantisi values (${bagli})`);
    const sonuc = await temizle();
    expect(sonuc.isaretlenenBelge).toBe(1);
    expect(await silinmeZamani(sahipsiz)).not.toBeNull();
    expect(await silinmeZamani(yeni)).toBeNull();
    expect(await silinmeZamani(bagli)).toBeNull();
  });

  it("kaydı olmayan eski dosya bildirilir, silinmez; yeni dosya ve kayıtlı dosya bildirilmez", async () => {
    const eski = join(klasor, "33333333-3333-4333-8333-333333333333.png");
    const yarim = join(klasor, "44444444-4444-4444-8444-444444444444.png.yaziliyor");
    const yeni = join(klasor, "55555555-5555-4555-8555-555555555555.png");
    for (const yol of [eski, yarim, yeni]) writeFileSync(yol, "x");
    const once = (simdi.getTime() - (dosyaTemizligiAyari.yeniDosyaDakika + 1) * 60_000) / 1000;
    utimesSync(eski, once, once);
    utimesSync(yarim, once, once);
    const sonuc = await temizle();
    expect(sonuc.kayitsiz).toEqual([
      "33333333-3333-4333-8333-333333333333.png",
      "44444444-4444-4444-8444-444444444444.png.yaziliyor",
    ]);
    expect(existsSync(eski)).toBe(true);
    for (const yol of [eski, yarim, yeni]) unlinkSync(yol);
  });

  it("kaydı olup diskte olmayan silinmemiş dosya bildirilir", async () => {
    const kayip = await gorsel("green");
    unlinkSync(join(klasor, `${kayip}.png`));
    const sonuc = await temizle();
    expect(sonuc.eksik).toEqual([`${kayip}.png`]);
    // Silinmiş işaretlenince eksik sayılmaz.
    await dosyaSil(vt, kayip);
    expect((await temizle()).eksik).toEqual([]);
  });

  it("kullanılmayan dosya yalnız sayılır: ayardaki kimlik kullanılmış sayılır, görselin boyutları ayrı sayılmaz", async () => {
    const onceki = (await temizle()).kullanilmayan;
    const tek = await gorsel("yellow");
    expect((await temizle()).kullanilmayan).toBe(onceki + 1);
    // Ayardaki değer (logo) dosyayı kullanır.
    await vt.execute(
      sql`insert into magaza_ayarlari (anahtar, deger) values ('deneme-logo', to_jsonb(${tek}::text))`,
    );
    expect((await temizle()).kullanilmayan).toBe(onceki);
    // Hiçbir yere bağlanmamış görsel boyutlarıyla bir kez sayılır: boyutlar kaynağı kullanmış sayılmaz.
    const kaydedilen = await gorselKaydet(vt, await png("purple"), klasor);
    if (!kaydedilen.tamam) throw new Error(kaydedilen.hata);
    const sonra = await temizle();
    expect(sonra.kullanilmayan).toBe(onceki + 1);
    // İşaretlenmez.
    expect(await silinmeZamani(kaydedilen.dosya.kimlik)).toBeNull();
  });
});
