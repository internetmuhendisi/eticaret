// Değişiklik dosyalarının geri dönüş notu ve ortak alan türleri (kart 0011).
// Bu testler veritabanı gerektirmez.
import { join, resolve } from "node:path";
import { getTableConfig, pgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import ayar from "../../../drizzle.config";
import { degisiklikKlasoru, notuOlmayanlar } from "../guncelle";
import { kimlik, tutar, zaman } from "../turler";

describe("geri dönüş notu", () => {
  it("çekirdeğin her değişiklik dosyasında var", () => {
    expect(notuOlmayanlar(degisiklikKlasoru)).toEqual([]);
  });

  it("notsuz, yanlış yerde ve tanımsız notlu dosyaları yakalar", () => {
    expect(notuOlmayanlar(join(import.meta.dirname, "ornek-degisiklikler"))).toEqual([
      "0002_notsuz.sql",
      "0003_not-ilk-satirda-degil.sql",
      "0004_tanimsiz-not.sql",
    ]);
  });
});

describe("değişiklik klasörü", () => {
  it("araç ile uygulama aynı klasörü kullanır", () => {
    const kok = join(import.meta.dirname, "..", "..", "..");
    expect(resolve(kok, ayar.out ?? "")).toBe(degisiklikKlasoru);
  });
});

describe("ortak alan türleri", () => {
  const { columns: alanlar } = getTableConfig(
    pgTable("deneme", { kimlik: kimlik(), zaman: zaman(), tutar: tutar() }),
  );
  const alan = (ad: string) => alanlar.find((a) => a.name === ad);

  it("kimlik veritabanının ürettiği rastgele UUID'dir", () => {
    expect(alan("kimlik")?.getSQLType()).toBe("uuid");
    expect(alan("kimlik")?.primary).toBe(true);
    expect(alan("kimlik")?.hasDefault).toBe(true);
  });

  it("zaman saat dilimlidir", () => {
    expect(alan("zaman")?.getSQLType()).toBe("timestamp with time zone");
  });

  it("tutar tam sayıdır", () => {
    expect(alan("tutar")?.getSQLType()).toBe("bigint");
  });
});
