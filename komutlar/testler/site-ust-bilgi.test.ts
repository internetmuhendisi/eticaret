// Üst bilgi kapatmanın betiklere bağlı olduğu ve denetimin kararı (kart 0037, karar 0053). Gerçek veritabanıyla
// ölçümü cekirdek/testler/veri-ayrimi.test.ts yapar.
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { ustBilgiHatalari, ustBilgiKapatmaSql } from "../site-ust-bilgi.mts";
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

describe("denetimin kararı", () => {
  it("boş sonuç geçer, açık kalan ya da okunamayan kırmızıdır", () => {
    expect(ustBilgiHatalari(true, "\n")).toEqual([]);
    expect(ustBilgiHatalari(true, "pg_roles,pg_stat_database\n")).toEqual([
      "açık: pg_roles,pg_stat_database",
    ]);
    expect(ustBilgiHatalari(false, "")).toEqual(["okunamadı"]);
  });
});
