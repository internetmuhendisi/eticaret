// Gerçek veritabanıyla çalışan testler (kart 0011). Yerel veritabanı kutusu açık olmalı
// (pnpm veritabani-baslat) ve bağlantı bilgisi kökteki .env dosyasında durmalı.
// VERITABANI_ADRESI'ndeki sitenin veritabanı önceden açılıp güncellenmiş olmalı (README).
import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { baglan, baglantiyiKapat, siteninVeritabani } from "../baglanti";
import { uygulananDegisiklikTablosu } from "../degisiklik-ayari";
import { siteVeritabaniniGuncelle } from "../guncelle";
import { veritabaniKimligi } from "../tablolar/veritabani-kimligi";
import { yoneticiAdresi } from "./adresler";

describe("uygulamanın bağlantısı", () => {
  afterAll(baglantiyiKapat);

  it("sitenin veritabanına bağlanır ve kimlik tablosunu okur", async () => {
    const satirlar = await siteninVeritabani().select().from(veritabaniKimligi);
    expect(satirlar).toHaveLength(1);
  });
});

describe("değişikliklerin uygulanması", () => {
  const geciciAd = `gecici_${randomBytes(6).toString("hex")}`;
  const yonetici = baglan(yoneticiAdresi("postgres"));
  const gecici = baglan(yoneticiAdresi(geciciAd));

  const tablolar = async () =>
    (
      await gecici.execute<{ ad: string }>(
        sql`select tablename as ad from pg_tables where schemaname = 'public' order by 1`,
      )
    ).rows.map((satir) => satir.ad);

  beforeAll(async () => {
    await yonetici.execute(sql`create database ${sql.identifier(geciciAd)}`);
  });

  afterAll(async () => {
    await gecici.$client.end();
    await yonetici.execute(sql`drop database if exists ${sql.identifier(geciciAd)} with (force)`);
    await yonetici.$client.end();
  });

  it("boş veritabanına sırayla uygulanır, ikinci çalıştırmada bir şey değişmez", async () => {
    const ilk = await siteVeritabaniniGuncelle(gecici, "deneme-sitesi");
    expect(ilk.once).toBe(0);
    expect(ilk.sonra).toBeGreaterThan(0);
    const ilkTablolar = await tablolar();
    expect(ilkTablolar).toContain("veritabani_kimligi");

    const ikinci = await siteVeritabaniniGuncelle(gecici, "deneme-sitesi");
    expect(ikinci).toEqual({ once: ilk.sonra, sonra: ilk.sonra });
    expect(await tablolar()).toEqual(ilkTablolar);
  });

  it("uygulanmış bir değişikliğin içeriği değişmişse hiçbir şey uygulamaz", async () => {
    await siteVeritabaniniGuncelle(gecici, "deneme-sitesi");
    const { tablo, sema } = uygulananDegisiklikTablosu;
    const kayit = sql`${sql.identifier(sema)}.${sql.identifier(tablo)}`;
    const ilk = sql`(select min(id) from ${kayit})`;
    const { rows } = await gecici.execute<{ ozet: string }>(
      sql`select hash as ozet from ${kayit} where id = ${ilk}`,
    );
    await gecici.execute(sql`update ${kayit} set hash = 'bozuk' where id = ${ilk}`);
    try {
      await expect(siteVeritabaniniGuncelle(gecici, "deneme-sitesi")).rejects.toThrow(
        "içeriği değişmiş",
      );
    } finally {
      await gecici.execute(sql`update ${kayit} set hash = ${rows[0]?.ozet} where id = ${ilk}`);
    }
  });

  it("başka bir sitenin veritabanına uygulanmaz", async () => {
    await siteVeritabaniniGuncelle(gecici, "deneme-sitesi");
    await expect(siteVeritabaniniGuncelle(gecici, "baska-site")).rejects.toThrow(
      "başka bir siteye ait",
    );
  });
});
