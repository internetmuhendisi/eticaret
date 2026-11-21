// Panelin ürün girdisinin çevirisi (kart 0263): ağırlık sitenin biriminde ve sayı biçiminde okunur, grama çevrilir;
// sayı türündeki özellik değeri metinden sayıya çevrilir, öteki türler dokunulmaz; okunamayan alan yolu ve koduyla
// döner. Ağırlığın ekrandaki yazılışı geri çevrilince aynı gramı verir. Açıklamanın bağlantı kuralı temizlikle aynıdır.
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { type AgirlikBirimi, agirlikBirimleri } from "../../../kayitlar/urun.ts";
import { bicimleyiciOlustur } from "../../../metinler/bicimleyici.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { ozellikServisi } from "../../ozellik/servis.ts";
import { aciklamayiTemizle } from "../aciklama.ts";
import { aciklamaBaglantisiGecerliMi } from "../aciklama-baglantisi.ts";
import { agirlikYazisi, panelGirdisiniCevir } from "../panel-girdisi.ts";

const bicimleyici = bicimleyiciOlustur({
  dil: "tr",
  saatDilimi: "Europe/Istanbul",
  para: { paraBirimi: "XTS", simgeYeri: "sonda", simgeBoslugu: true, ondalikSayisi: 2 },
  sayi: { binlikAyirici: ".", ondalikAyirici: "," },
});
const ayar = (agirlikBirimi: AgirlikBirimi = "kg") => ({ bicimleyici, agirlikBirimi });
const yapan = { tur: "yonetici", kimlik: randomUUID() } as const;

const temizlenecekler: (() => Promise<void>)[] = [];
const siteAc = async (): Promise<Veritabani> => {
  const acilan = await denemeSitesiAc("panel-girdisi");
  temizlenecekler.push(acilan.sil);
  return acilan.vt;
};
afterEach(async () => {
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

describe("panel girdisi", () => {
  it("ağırlık sitenin biriminde okunup grama çevrilir; boş null, okunamayan alanın hatası", async () => {
    const vt = await siteAc();
    expect(await panelGirdisiniCevir(vt, { ad: "A", agirlik: "0,35" }, ayar())).toEqual({
      ad: "A",
      agirlikGram: 350,
    });
    expect(await panelGirdisiniCevir(vt, { agirlik: "1.250" }, ayar("g"))).toEqual({
      agirlikGram: 1250,
    });
    expect(await panelGirdisiniCevir(vt, { agirlik: "2" }, ayar("lb"))).toEqual({
      agirlikGram: 907,
    });
    expect(await panelGirdisiniCevir(vt, { agirlik: " " }, ayar())).toEqual({ agirlikGram: null });
    expect(await panelGirdisiniCevir(vt, { agirlik: null }, ayar())).toEqual({ agirlikGram: null });
    expect(await panelGirdisiniCevir(vt, { ad: "Ağırlıksız" }, ayar())).toEqual({
      ad: "Ağırlıksız",
    });
    // Sınır (10.000 kg) dahil geçer, bir gram fazlası sınırın koduyla döner.
    expect(await panelGirdisiniCevir(vt, { agirlik: "10.000" }, ayar())).toEqual({
      agirlikGram: 10_000_000,
    });
    await expect(panelGirdisiniCevir(vt, { agirlik: "10.000,001" }, ayar())).rejects.toMatchObject({
      ayrinti: [{ alan: "agirlik", kod: "agirlik-siniri" }],
    });
    for (const agirlik of ["1,2,3", "-1", "0,0001", 5, "bir"]) {
      await expect(
        panelGirdisiniCevir(vt, { agirlik }, ayar()),
        String(agirlik),
      ).rejects.toMatchObject({
        kod: "dogrulama",
        ayrinti: [{ alan: "agirlik", kod: "agirlik-bicimi" }],
      });
    }
  });

  it("ağırlığın ekrandaki yazılışı okununca aynı gramı verir", () => {
    for (const birim of Object.keys(agirlikBirimleri) as AgirlikBirimi[]) {
      for (const gram of [0, 1, 350, 1000, 1250, 907, 123_456]) {
        const yazi = agirlikYazisi(gram, ayar(birim));
        const sayi = bicimleyici.sayiOku(yazi, agirlikBirimleri[birim].ondalik) ?? Number.NaN;
        // Birimin ondalığı gramdan kaba olabilir (ons, iki ondalık): en çok yarım birim kadar sapar.
        expect(
          Math.abs(sayi * agirlikBirimleri[birim].gram - gram),
          `${birim} ${gram}`,
        ).toBeLessThanOrEqual(
          agirlikBirimleri[birim].gram / 10 ** agirlikBirimleri[birim].ondalik / 2,
        );
      }
    }
    expect(agirlikYazisi(350, ayar())).toBe("0,35");
    expect(agirlikYazisi(2000, ayar())).toBe("2");
    expect(agirlikYazisi(undefined, ayar())).toBe("");
  });

  it("sayı özelliğinin metni sayıya çevrilir; öteki türler ve sayı değer dokunulmaz; okunamayan yolunu taşır", async () => {
    const vt = await siteAc();
    const sayi = await ozellikServisi.ekle(vt, yapan, { ad: "Hacim", tur: "sayi" });
    const metin = await ozellikServisi.ekle(vt, yapan, { ad: "Not", tur: "metin" });
    const cevrilen = await panelGirdisiniCevir(
      vt,
      {
        ozellikler: [
          { ozellik: metin, deger: "12,5" },
          { ozellik: sayi.toUpperCase(), deger: "-12,5" },
          { ozellik: sayi, deger: 7 },
        ],
      },
      ayar(),
    );
    expect(cevrilen["ozellikler"]).toEqual([
      { ozellik: metin, deger: "12,5" },
      { ozellik: sayi.toUpperCase(), deger: -12.5 },
      { ozellik: sayi, deger: 7 },
    ]);
    await expect(
      panelGirdisiniCevir(
        vt,
        {
          agirlik: "x",
          ozellikler: [
            { ozellik: metin, deger: "a" },
            { ozellik: sayi, deger: "on" },
          ],
        },
        ayar(),
      ),
    ).rejects.toMatchObject({
      ayrinti: [
        { alan: "agirlik", kod: "agirlik-bicimi" },
        { alan: "ozellikler.1.deger", kod: "ozellik-deger-gecersiz" },
      ],
    });
  });
});

describe("açıklamanın bağlantı kuralı", () => {
  it("panel ve temizlik aynı adresleri kabul eder", () => {
    const adresler = [
      "https://ornek.test/a",
      "http://ornek.test",
      "mailto:a@ornek.test",
      "tel:+905551112233",
      "/kategori/kupalar",
      "javascript:alert(1)",
      "JAVASCRIPT:alert(1)",
      "data:text/html,x",
      "vbscript:x",
      "//baska.test",
      "ftp://ornek.test",
      "https:",
    ];
    for (const adres of adresler) {
      const temiz = aciklamayiTemizle(`<p><a href="${adres}">a</a></p>`) ?? "";
      const kalan = temiz.includes(`href="${adres}"`);
      // Temizlik "https:" gibi boş adresi bırakabilir; panel onu reddeder (daha sıkı olabilir, gevşek olamaz).
      if (aciklamaBaglantisiGecerliMi(adres)) expect(kalan, adres).toBe(true);
      else if (adres !== "https:") expect(kalan, adres).toBe(false);
    }
  });
});
