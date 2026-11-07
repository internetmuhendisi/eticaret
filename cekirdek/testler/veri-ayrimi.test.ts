// Veri ayrımı (değişmez kural 2, kararlar 0003, 0022, 0023; kartlar 0012, 0036).
// Test iki deneme sitesi için gerçek komutun yoluyla iki veritabanı ve iki kullanıcı açar,
// bir sitenin öteki sitenin verisine hiçbir yoldan ulaşamadığını gösterir ve sonunda hepsini siler.
// Koruma iki katmanlıdır, her katman ayrı denetlenir: veritabanının izinleri ve bağlantı kuralları
// (sunucu/veritabani/pg_hba.conf). Yerel veritabanı kutusu açık olmalı (pnpm veritabani-baslat).
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ustBilgiAcikOlanlarSql, ustBilgiKapatmaSql } from "../../komutlar/site-ust-bilgi.mts";
import { baglan, siteVeritabaniAdi, type Veritabani } from "../veritabani/baglanti";
import { siteVeritabaniniGuncelle } from "../veritabani/guncelle";
import { veritabaniKimligi } from "../veritabani/tablolar/veritabani-kimligi";
import { adres, yoneticiAdresi } from "../veritabani/testler/adresler";
import { denemeVeritabaniAc } from "../veritabani/testler/deneme-sitesi.ts";

const kok = join(import.meta.dirname, "..", "..");
const ek = randomBytes(4).toString("hex");

const denemeSitesi = (harf: string) => {
  const kodAdi = `ayrim-${harf}-${ek}`;
  const ad = siteVeritabaniAdi(kodAdi);
  return { kodAdi, ad, sifre: randomBytes(24).toString("base64url") };
};

const a = denemeSitesi("a");
const b = denemeSitesi("b");
const acikVeritabani = `ayrim_acik_${ek}`;

const yonetici = baglan(yoneticiAdresi("postgres"));
const baglantilar: Veritabani[] = [];

// Bağlantının bu iki gerekçeden biriyle reddedilmesi beklenir: bağlantı kuralı ya da izin.
// Yanlış şifre gibi başka bir hata testi geçirmez.
const reddedildi = /no pg_hba\.conf entry|permission denied for database/;
const izinYok = /permission denied/;

// Bağlanıp tek bir sorgu çalıştırır. Başarılıysa "bağlandı", değilse hatanın kendisini döner.
const dene = async (kullanici: string, sifre: string, veritabani: string, sorgu = "select 1") => {
  const istemci = new pg.Client({ connectionString: adres(kullanici, sifre, veritabani) });
  try {
    await istemci.connect();
    await istemci.query(sorgu);
    return "bağlandı";
  } catch (hata) {
    return (hata as Error).message;
  } finally {
    await istemci.end().catch(() => undefined);
  }
};

beforeAll(async () => {
  for (const site of [a, b]) {
    await denemeVeritabaniAc(site.ad, site.sifre);
    const veritabani = baglan(adres(site.ad, site.sifre, site.ad));
    baglantilar.push(veritabani);
    await siteVeritabaniniGuncelle(veritabani, site.kodAdi);
  }
  // Yöneticinin açtığı, izinlerine dokunulmamış veritabanı: herkese bağlanma izni açıktır.
  await yonetici.execute(sql`create database ${sql.identifier(acikVeritabani)}`);
});

afterAll(async () => {
  await Promise.all(baglantilar.map((veritabani) => veritabani.$client.end()));
  for (const ad of [a.ad, b.ad, acikVeritabani]) {
    await yonetici.execute(sql`drop database if exists ${sql.identifier(ad)} with (force)`);
  }
  for (const ad of [a.ad, b.ad]) {
    await yonetici.execute(sql`drop role if exists ${sql.identifier(ad)}`);
  }
  await yonetici.$client.end();
});

describe("bağlantı kuralları", () => {
  it("her site kendi veritabanına girer", async () => {
    expect(await dene(a.ad, a.sifre, a.ad)).toBe("bağlandı");
    expect(await dene(b.ad, b.sifre, b.ad)).toBe("bağlandı");
  });

  it("bir site ötekinin veritabanına giremez", async () => {
    expect(await dene(a.ad, a.sifre, b.ad)).toMatch(reddedildi);
    expect(await dene(b.ad, b.sifre, a.ad)).toMatch(reddedildi);
  });

  it("site PostgreSQL'in kendi veritabanlarına giremez", async () => {
    for (const veritabani of ["postgres", "template1"]) {
      expect(await dene(a.ad, a.sifre, veritabani)).toMatch(reddedildi);
    }
  });

  it("site, herkese açık bırakılmış bir veritabanına da giremez", async () => {
    const izin = await yonetici.execute<{ var: boolean }>(
      sql`select has_database_privilege(${a.ad}, ${acikVeritabani}, 'CONNECT') as var`,
    );
    expect(izin.rows[0]?.var).toBe(true);
    expect(await dene(a.ad, a.sifre, acikVeritabani)).toMatch(reddedildi);
  });
});

describe("izinler", () => {
  it("bir sitenin ötekinin veritabanına bağlanma izni yok", async () => {
    const sonuc = await yonetici.execute<{ ab: boolean; ba: boolean }>(
      sql`select has_database_privilege(${a.ad}, ${b.ad}, 'CONNECT') as ab,
                 has_database_privilege(${b.ad}, ${a.ad}, 'CONNECT') as ba`,
    );
    expect(sonuc.rows[0]).toEqual({ ab: false, ba: false });
  });

  it("bir site ötekinin tablosunu okuyamaz ve yazamaz", async () => {
    const bYonetici = baglan(yoneticiAdresi(b.ad));
    try {
      const sonuc = await bYonetici.execute<{ izin: string; var: boolean }>(
        sql`select izin, has_table_privilege(${a.ad}, 'public.veritabani_kimligi', izin) as var
            from unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE']) as izin`,
      );
      expect(sonuc.rows.filter((satir) => satir.var).map((satir) => satir.izin)).toEqual([]);
    } finally {
      await bYonetici.$client.end();
    }
  });

  it("her sitenin veritabanında yalnız kendi kimliği var", async () => {
    for (const [sira, site] of [a, b].entries()) {
      const satirlar = await baglantilar[sira]?.select().from(veritabaniKimligi);
      expect(satirlar?.map((satir) => satir.site_kod_adi)).toEqual([site.kodAdi]);
    }
  });

  it("site, öteki veritabanlarına köprü kuran eklentileri açamaz", async () => {
    for (const eklenti of ["dblink", "postgres_fdw"]) {
      expect(await dene(a.ad, a.sifre, a.ad, `create extension ${eklenti}`)).toMatch(izinYok);
    }
  });
});

// Başka sitelerin üst bilgisi (kart 0037, karar 0053). Hepsi sitenin kullanıcısıyla, kendi veritabanında denenir.
describe("üst bilgi", () => {
  const kapaliSorgular = [
    "select datname from pg_database",
    "select rolname from pg_roles",
    "select usename from pg_user",
    "select groname from pg_group",
    "select * from pg_auth_members",
    "select * from pg_shdepend",
    "select * from pg_shdescription",
    "select * from pg_db_role_setting",
    "select * from pg_locks",
    "select * from pg_prepared_xacts",
    "select tup_inserted, xact_commit from pg_stat_database",
    "select * from pg_stat_database_conflicts",
    "select usename, datname from pg_stat_activity",
    "select * from pg_stat_ssl",
    "select pg_stat_get_db_xact_commit(1)",
    "select pg_stat_get_db_tuples_inserted(1)",
    "select pg_stat_get_db_numbackends(1)",
    "select * from pg_stat_get_activity(null)",
    "select pg_stat_get_backend_dbid(1)",
    "select pg_tablespace_size('pg_default')",
    "select pg_lock_status()",
  ];

  it.each(kapaliSorgular)("site okuyamaz: %s", async (sorgu) => {
    expect(await dene(a.ad, a.sifre, a.ad, sorgu)).toMatch(izinYok);
  });

  it("site izni kendine geri veremez", async () => {
    for (const sorgu of [
      "grant select on pg_catalog.pg_database to public",
      "grant execute on function pg_catalog.pg_stat_get_db_xact_commit(oid) to public",
    ]) {
      // Sahibi olmadığı kayıtta izin veremez: PostgreSQL uyarıyla geçer ya da reddeder, izin açılmaz.
      await dene(a.ad, a.sifre, a.ad, sorgu);
    }
    expect(await dene(a.ad, a.sifre, a.ad, "select datname from pg_database")).toMatch(izinYok);
    expect(await dene(a.ad, a.sifre, a.ad, "select pg_stat_get_db_xact_commit(1)")).toMatch(
      izinYok,
    );
  });

  // Kabul edilen sınır (karar 0053): bunlar kapanmaz. Kapanırsa ya da sınır genişlerse karar yeniden okunmalı.
  it("bilinen sınır: site başka kullanıcının adını numarasıyla görebilir, ama sayacını ve tablosunu göremez", async () => {
    const istemci = new pg.Client({ connectionString: adres(a.ad, a.sifre, a.ad) });
    await istemci.connect();
    try {
      const oid = await yonetici.execute<{ oid: string }>(
        sql`select oid::text from pg_roles where rolname = ${b.ad}`,
      );
      const sonuc = await istemci.query("select $1::oid::regrole::text as ad", [oid.rows[0]?.oid]);
      expect(sonuc.rows[0].ad).toBe(b.ad);
    } finally {
      await istemci.end();
    }
    expect(await dene(a.ad, a.sifre, b.ad)).toMatch(reddedildi);
  });

  it("listedeki bütün görünüm ve işlevler site kullanıcısına kapalı", async () => {
    for (const site of [a, b]) {
      const yoneticiBaglantisi = baglan(yoneticiAdresi(site.ad));
      try {
        const sonuc = await yoneticiBaglantisi.$client.query(ustBilgiAcikOlanlarSql(site.ad));
        expect(Object.values(sonuc.rows[0] ?? {})).toEqual([""]);
      } finally {
        await yoneticiBaglantisi.$client.end();
      }
    }
  });

  it("denetim açık kalanı görür", async () => {
    const yoneticiBaglantisi = baglan(yoneticiAdresi(a.ad));
    try {
      await yoneticiBaglantisi.execute(sql`grant select on pg_catalog.pg_stat_database to public`);
      await yoneticiBaglantisi.execute(
        sql`grant execute on function pg_catalog.pg_stat_get_db_xact_commit(oid) to public`,
      );
      const sonuc = await yoneticiBaglantisi.$client.query(ustBilgiAcikOlanlarSql(a.ad));
      expect(Object.values(sonuc.rows[0] ?? {})).toEqual([
        "pg_stat_database,pg_stat_get_db_xact_commit",
      ]);
      // Yeniden çalıştırmak kapatır: komut tekrar çalıştırılabilir.
      await yoneticiBaglantisi.$client.query(ustBilgiKapatmaSql());
      const kapali = await yoneticiBaglantisi.$client.query(ustBilgiAcikOlanlarSql(a.ad));
      expect(Object.values(kapali.rows[0] ?? {})).toEqual([""]);
    } finally {
      await yoneticiBaglantisi.$client.end();
    }
  });

  it("site kendi işini yapabilir: tablo, değişiklik kaydı, tablo listesi", async () => {
    for (const sorgu of [
      "create table kendi_tablom (x int)",
      "insert into kendi_tablom values (1)",
      "select * from kendi_tablom",
      "select table_name from information_schema.tables",
      "select tablename from pg_tables",
      "select indexname from pg_indexes",
      "drop table kendi_tablom",
    ]) {
      expect(await dene(a.ad, a.sifre, a.ad, sorgu)).toBe("bağlandı");
    }
    await expect(
      siteVeritabaniniGuncelle(baglantilar[0] as Veritabani, a.kodAdi),
    ).resolves.toBeDefined();
  });

  it("yedek alınır; yedekten açılan veritabanında veri gelir, izin gelmez, kapatınca kapalıdır", async () => {
    const kutu = (girdi: Buffer | string | undefined, ...arguman: string[]) =>
      spawnSync(
        "docker",
        [
          ...[
            "compose",
            "-f",
            join(kok, "sunucu", "compose.yaml"),
            "--env-file",
            join(kok, ".env"),
          ],
          ...["exec", "-T", "veritabani", ...arguman],
        ],
        { input: girdi, maxBuffer: 50_000_000 },
      );
    const yedek = kutu(undefined, "pg_dump", "-U", "postgres", "-Fc", "-d", a.ad);
    expect(yedek.status).toBe(0);

    const yeni = `${a.ad}_yeni`;
    await yonetici.execute(
      sql`create database ${sql.identifier(yeni)} owner ${sql.identifier(a.ad)}`,
    );
    const acilan = baglan(yoneticiAdresi(yeni));
    try {
      const yukleme = kutu(
        yedek.stdout,
        ...["pg_restore", "-U", "postgres", "--no-owner", "--no-acl", `--role=${a.ad}`],
        ...["--exit-on-error", "-d", yeni],
      );
      expect(yukleme.stderr.toString()).toBe("");
      const satirlar = await acilan.select().from(veritabaniKimligi);
      expect(satirlar.map((satir) => satir.site_kod_adi)).toEqual([a.kodAdi]);
      // Geri yükleme bu yüzden kapatmayı yeniden uygular (komutlar/yedek.mts).
      const once = await acilan.$client.query(ustBilgiAcikOlanlarSql(a.ad));
      expect(Object.values(once.rows[0] ?? {})[0]).toContain("pg_database");
      await acilan.$client.query(ustBilgiKapatmaSql());
      const sonra = await acilan.$client.query(ustBilgiAcikOlanlarSql(a.ad));
      expect(Object.values(sonra.rows[0] ?? {})).toEqual([""]);
    } finally {
      await acilan.$client.end();
      await yonetici.execute(sql`drop database if exists ${sql.identifier(yeni)} with (force)`);
    }
  }, 60_000);
});

describe("bağlantı bilgisi", () => {
  it("site, veritabanının şifre kayıtlarını okuyamaz", async () => {
    for (const sorgu of ["select rolpassword from pg_authid", "select passwd from pg_shadow"]) {
      expect(await dene(a.ad, a.sifre, a.ad, sorgu)).toMatch(izinYok);
    }
  });

  // Gizli bilgiler gizliBilgi() ile okunur, adları gizli bilgi kaydında tanımlıdır (karar 0031).
  // Kayıt adı yalnız tanımlar, okumaz; adresi çekirdekte yalnız bağlantı dosyası okur.
  it("çekirdekte veritabanı adresini yalnız bağlantı dosyası okur", () => {
    const dosyalar = spawnSync("git", ["ls-files", "cekirdek"], { cwd: kok, encoding: "utf8" })
      .stdout.split("\n")
      .filter((dosya) => /\.tsx?$/.test(dosya) && !dosya.includes("/testler/"));
    const icerik = (dosya: string) => readFileSync(join(kok, dosya), "utf8");
    const kayit = "cekirdek/kayitlar/gizli-bilgiler.ts";
    const okuma = "cekirdek/ayar-semasi/gizli-bilgi.ts";

    const adGecenler = dosyalar.filter((dosya) => icerik(dosya).includes("VERITABANI_"));
    expect(adGecenler.sort()).toEqual([kayit, "cekirdek/veritabani/baglanti.ts"].sort());

    const adresiOkuyanlar = dosyalar.filter((dosya) =>
      /gizliBilgi\(\s*["']VERITABANI_ADRESI["']/.test(icerik(dosya)),
    );
    expect(adresiOkuyanlar).toEqual(["cekirdek/veritabani/baglanti.ts"]);

    expect(icerik(kayit)).not.toMatch(/process\.env|readFileSync|import\s|export\s[^;]*\sfrom\s/);
    expect(icerik(okuma)).not.toContain("VERITABANI_");

    // Adı yazmadan okumanın yolu da kapalı: okuma işlevini çekirdekte yalnız bağlantı dosyası ve kendi
    // anahtarı için iki aşamalı giriş, kaydı yalnız okuma işlevi içe alabilir (dışa aktarma ve dinamik
    // içe alma da sayılır).
    const yolGecen = (ad: string) =>
      dosyalar.filter((dosya) => new RegExp(`["'][^"']*/${ad}(?:\\.ts)?["']`).test(icerik(dosya)));
    const ikiAsama = "cekirdek/moduller/oturum/iki-asama.ts";
    expect(yolGecen("gizli-bilgi").sort()).toEqual(
      [ikiAsama, "cekirdek/veritabani/baglanti.ts"].sort(),
    );
    // İki aşamalı giriş okuma işlevini yalnız kendi anahtarıyla çağırır, işlevi başka yere vermez.
    expect(icerik(ikiAsama).match(/gizliBilgi\b/g)).toHaveLength(2);
    expect(icerik(ikiAsama)).toContain('gizliBilgi("IKI_ASAMA_ANAHTARI")');
    expect(yolGecen("gizli-bilgiler")).toEqual([okuma]);
  });

  it("kayıtlı hiçbir dosyada şifreli veritabanı adresi yok", () => {
    const sifreliAdres = /postgres(?:ql)?:\/\/[^\s:@/<>]+:[^\s@/<>]+@/;
    const dosyalar = spawnSync("git", ["ls-files"], { cwd: kok, encoding: "utf8" })
      .stdout.split("\n")
      .filter(Boolean);
    const bulunanlar = dosyalar.filter((dosya) =>
      sifreliAdres.test(readFileSync(join(kok, dosya), "utf8")),
    );
    expect(bulunanlar).toEqual([]);
  });
});
