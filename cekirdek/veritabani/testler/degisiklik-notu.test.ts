// Değişiklik dosyalarının geri dönüş notu ve ortak alan türleri (kart 0011).
// Bu testler veritabanı gerektirmez.
import { join, resolve } from "node:path";
import { getTableConfig, pgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import ayar from "../../../drizzle.config";
import {
  degisiklikDosyalari,
  degisiklikKlasoru,
  kayitHatalari,
  notuOlmayanlar,
  siraHatalari,
} from "../guncelle";
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

  it("çekirdeğin değişiklikleri zaman sırasında", () => {
    const dosyalar = degisiklikDosyalari(degisiklikKlasoru);
    expect(dosyalar.length).toBeGreaterThan(0);
    expect(siraHatalari(dosyalar)).toEqual([]);
  });
});

describe("sıra ve kayıt denetimi", () => {
  const a = { ad: "0000_a", zaman: 100, ozet: "oa" };
  const b = { ad: "0001_b", zaman: 200, ozet: "ob" };

  it("zamanı bir öncekinden eski değişikliği yakalar", () => {
    expect(siraHatalari([a, b])).toEqual([]);
    expect(siraHatalari([a, { ...b, zaman: 50 }])).toHaveLength(1);
    expect(siraHatalari([a, { ...b, zaman: 100 }])).toHaveLength(1);
  });

  it("uygulanmış değişiklikler dosyaların başıyla aynı olmalı", () => {
    expect(kayitHatalari([a, b], [])).toEqual([]);
    expect(kayitHatalari([a, b], [{ ozet: "oa" }])).toEqual([]);
    expect(kayitHatalari([a, b], [{ ozet: "oa" }, { ozet: "ob" }])).toEqual([]);
  });

  it("içeriği değişmiş, sırası kaymış ya da dosyası olmayan değişikliği yakalar", () => {
    expect(kayitHatalari([a, b], [{ ozet: "baska" }])).toHaveLength(1);
    expect(kayitHatalari([a, b], [{ ozet: "ob" }])).toHaveLength(1);
    expect(kayitHatalari([a], [{ ozet: "oa" }, { ozet: "ob" }])).toHaveLength(1);
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
