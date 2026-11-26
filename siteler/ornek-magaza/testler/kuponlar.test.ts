// Örnek Mağaza'nın başlangıç kuponları (kart 0312): KURALLAR.md'deki tablonun her durumu, katalog ve kuponlar boş bir
// veritabanına kurulduktan sonra çekirdeğin kendi işlevleriyle ve sabit zamanla gerçekten o durumda görünür. İkinci kurulum
// hiçbir şey yazmaz.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { siteKlasorunuOku } from "../../../cekirdek/ayar-semasi/site-klasoru.ts";
import { kuponBaslangiciniKur } from "../../../cekirdek/moduller/kampanya/baslangic.ts";
import { kuponlar } from "../../../cekirdek/moduller/kampanya/model.ts";
import { sepetiHesapla } from "../../../cekirdek/moduller/sepet/hesap.ts";
import { katalogBaslangiciniKur } from "../../../cekirdek/moduller/urun/baslangic.ts";
import { urunBirimleri, urunler } from "../../../cekirdek/moduller/urun/model.ts";
import type { Veritabani } from "../../../cekirdek/veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../cekirdek/veritabani/testler/deneme-sitesi.ts";

const site = siteKlasorunuOku(join(import.meta.dirname, ".."));

let vt: Veritabani;
let sil: () => Promise<void>;
const klasor = mkdtempSync(join(tmpdir(), "ornek-kuponlar-"));
beforeAll(async () => {
  ({ vt, sil } = await denemeSitesiAc("ornek-kuponlar"));
  // Galeri görselleri geçici bir dosya klasörüne kaydedilir (kart 0087).
  expect(await katalogBaslangiciniKur(vt, site, () => klasor)).toBe(true);
  expect(await kuponBaslangiciniKur(vt, site)).toEqual({ sonuc: "yazildi", atlananlar: [] });
}, 180_000);
afterAll(async () => {
  await sil();
  rmSync(klasor, { recursive: true, force: true });
});

// Ürünün ilk satılabilir birimi (adres adıyla).
const birimi = async (adresAdi: string) => {
  const [satir] = await vt
    .select({ birim: urunBirimleri.kimlik })
    .from(urunBirimleri)
    .innerJoin(urunler, eq(urunler.kimlik, urunBirimleri.urun_kimligi))
    .where(eq(urunler.adres_adi, adresAdi));
  if (satir === undefined) throw new Error(`Ürün yok: ${adresAdi}`);
  return satir.birim;
};

const hesapla = (kalemler: { birim: string; adet: number }[], kod: string, an: Date) =>
  sepetiHesapla(vt, site, kalemler, { an, kupon: { kod } });

const kasim = new Date("2026-11-26T12:00:00+03:00");

describe("Örnek Mağaza'nın kuponları", () => {
  it("dört kupon tablodaki gibi kurulur; ikinci kurulum yazmaz", async () => {
    expect(
      (await vt.select().from(kuponlar).orderBy(kuponlar.kod)).map((k) => [k.kod, k.tur, k.deger]),
    ).toEqual([
      ["GIYIM50", "tutar", 5_000],
      ["HOSGELDIN10", "yuzde", 10],
      ["KARGOBEDAVA", "ucretsiz-kargo", 0],
      ["YILBASI20", "yuzde", 20],
    ]);
    expect(await kuponBaslangiciniKur(vt, site)).toEqual({ sonuc: "kurulu" });
  });

  it("HOSGELDIN10 küçük harfle de bulunur; 500,00'ın altında geçmez", async () => {
    const pahali = await birimi("yoga-mati-6-mm");
    const sonuc = await hesapla([{ birim: pahali, adet: 1 }], "hosgeldin10", kasim);
    expect(sonuc.kupon).toMatchObject({ durum: "uygulandi", kod: "HOSGELDIN10" });
    const ucuz = await hesapla(
      [{ birim: await birimi("porselen-kupa"), adet: 1 }],
      "HOSGELDIN10",
      kasim,
    );
    expect(ucuz.kupon).toMatchObject({ durum: "gecmedi", neden: "en-az" });
  });

  it("GIYIM50 yalnız giyim ürünlerinde, sepet 400,00 üstündeyken geçer", async () => {
    const tisort = await birimi("basic-tisort");
    const yoga = await birimi("yoga-mati-6-mm");
    const sonuc = await hesapla(
      [
        { birim: tisort, adet: 1 },
        { birim: yoga, adet: 1 },
      ],
      "GIYIM50",
      kasim,
    );
    expect(sonuc.kupon).toMatchObject({ durum: "uygulandi", indirim: 5_000 });
    expect(sonuc.satirlar.map((satir) => satir.indirim)).toEqual([5_000, undefined]);
    const giyimsiz = await hesapla([{ birim: yoga, adet: 1 }], "GIYIM50", kasim);
    expect(giyimsiz.kupon).toMatchObject({ durum: "gecmedi", neden: "urun-yok" });
  });

  it("YILBASI20 25 Aralık 00.00'dan (İstanbul) 1 Ocak 00.00'a kadar geçer", async () => {
    const kalemler = [{ birim: await birimi("porselen-kupa"), adet: 1 }];
    expect((await hesapla(kalemler, "YILBASI20", kasim)).kupon).toMatchObject({
      neden: "baslamadi",
    });
    expect(
      (await hesapla(kalemler, "YILBASI20", new Date("2026-12-25T00:00:00+03:00"))).kupon,
    ).toMatchObject({ durum: "uygulandi" });
    expect(
      (await hesapla(kalemler, "YILBASI20", new Date("2027-01-01T00:00:00+03:00"))).kupon,
    ).toMatchObject({ neden: "suresi-doldu" });
  });
});
