// Üst bilgi kapatmanın betiklere bağlı olduğu ve denetimin kararı (kart 0037, karar 0053). Gerçek veritabanıyla
// ölçümü cekirdek/testler/veri-ayrimi.test.ts yapar.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { guvenliOturumAyari, ustBilgiHatalari, ustBilgiKapatmaSql } from "../site-ust-bilgi.mts";
import { veritabaniAcmaBetigi } from "../site-veritabani.mts";
import { siteAcmaBetigi } from "../sunucu-veritabani.mts";
import { yanaAcmaBetigi } from "../yedek.mts";

describe("üst bilgi kapatma", () => {
  it("açma betiği sitenin veritabanına geçip kapatır", () => {
    const betik = veritabaniAcmaBetigi();
    const gecis = betik.indexOf('\\connect :"ad"');
    expect(gecis).toBeGreaterThan(0);
    expect(betik.indexOf(ustBilgiKapatmaSql())).toBeGreaterThan(gecis);
  });

  it("sunucudaki açma betiği de kapatır, sözdizimi geçerli", () => {
    const betik = siteAcmaBetigi("deneme", "ornek-magaza");
    expect(betik).toContain(ustBilgiKapatmaSql());
    expect(spawnSync("bash", ["-n"], { input: betik }).status).toBe(0);
  });

  it("geri yükleme yedekten sonra kapatır, tutmazsa canlıya dokunmaz", () => {
    const betik = yanaAcmaBetigi(
      "deneme",
      "ornek-magaza",
      "20261106T000000Z.dump.age",
      `AGE-SECRET-KEY-1${"Q".repeat(58)}`,
    );
    const yukleme = betik.indexOf("pg_restore");
    const kapatma = betik.indexOf(ustBilgiKapatmaSql());
    expect(yukleme).toBeGreaterThan(0);
    expect(kapatma).toBeGreaterThan(yukleme);
    expect(betik.slice(kapatma)).toContain("üst bilgi izinleri kapatılamadı");
    expect(spawnSync("bash", ["-n"], { input: betik }).status).toBe(0);
  });
});

describe("yönetici oturumu", () => {
  it("sitenin veritabanına giden bütün sunucu komutları güvenli ayarla açılır", () => {
    const kok = join(import.meta.dirname, "..", "..");
    const satirlar = [
      "komutlar/yedek.mts",
      "komutlar/yedek-denemesi.mts",
      "komutlar/sunucu-denetle.mts",
      "komutlar/sunucu-veritabani.mts",
      "komutlar/sunucu-veritabani-denemesi.mts",
      "sunucu/yedek/gece.sh",
    ].flatMap((dosya) => readFileSync(join(kok, dosya), "utf8").split("\n"));
    const komutlar = satirlar.filter(
      (satir) =>
        /docker exec.*\b(psql|pg_dump|pg_restore)\b.*-U postgres/.test(satir) &&
        !/-d postgres\b/.test(satir) &&
        /-d\s|pg_dump/.test(satir) &&
        !satir.includes('"$prova"'),
    );
    expect(komutlar.length).toBeGreaterThan(4);
    expect(komutlar.filter((satir) => !/guvenliOturum|PGOPTIONS=/.test(satir))).toEqual([]);
  });

  it("gece yedeğinin ayarı kayıttaki ayarla aynı", () => {
    const gece = readFileSync(
      join(import.meta.dirname, "..", "..", "sunucu", "yedek", "gece.sh"),
      "utf8",
    );
    expect(gece).toContain(`PGOPTIONS='${guvenliOturumAyari}'`);
  });
});

describe("denetimin kararı", () => {
  it("boş sonuç geçer, açık kalan ya da okunamayan kırmızıdır", () => {
    expect(ustBilgiHatalari(true, "\n")).toEqual([]);
    expect(ustBilgiHatalari(true, "pg_roles,pg_stat_database\n")).toEqual([
      "açık: pg_roles,pg_stat_database",
    ]);
    expect(ustBilgiHatalari(false, "")).toEqual(["okunamadı"]);
  });
});
