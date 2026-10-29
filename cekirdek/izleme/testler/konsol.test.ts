// Sunucu konsolunun günlüğe bağlanması (kart 0014, karar 0025).
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { gunlukOlustur } from "../gunluk.ts";
import { konsoluGunlugeBagla } from "../konsol.ts";
import { kartIsareti } from "../maskele.ts";

type Satir = { seviye?: unknown; mesaj?: unknown; alanlar?: unknown };

describe("konsolun günlüğe bağlanması", () => {
  const asil = { ...console };
  let satirlar: Satir[] = [];

  beforeEach(() => {
    satirlar = [];
    konsoluGunlugeBagla(
      gunlukOlustur({
        site: () => "deneme-sitesi",
        yaz: (satir) => satirlar.push(JSON.parse(satir)),
      }),
    );
  });

  afterEach(() => {
    Object.assign(console, asil);
  });

  it("konsol yöntemlerini günlük seviyelerine çevirir", () => {
    console.log("a");
    console.info("b");
    console.warn("c");
    console.error("d");
    expect(satirlar.map((s) => [s.seviye, s.mesaj])).toEqual([
      ["bilgi", "a"],
      ["bilgi", "b"],
      ["uyari", "c"],
      ["hata", "d"],
    ]);
  });

  it("konsola yazılan hatayı da maskeler", () => {
    console.error("⨯", new Error("kart 4111111111111111 sifre=Gizli123"));
    const metin = JSON.stringify(satirlar);
    expect(metin).toContain(kartIsareti);
    expect(metin).not.toContain("4111");
    expect(metin).not.toContain("Gizli123");
  });

  it("boş satırı yazmaz", () => {
    console.log("");
    console.log();
    expect(satirlar).toEqual([]);
  });

  it("metinle başlamayan çağrıyı da yazar", () => {
    console.error({ kod: 1 });
    expect(satirlar[0]).toMatchObject({ seviye: "hata", alanlar: { degerler: [{ kod: 1 }] } });
  });
});
