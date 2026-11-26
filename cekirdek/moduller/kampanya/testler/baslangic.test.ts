// Başlangıç kuponlarının kurulumu gerçek veritabanıyla (kart 0312). Deneme sitesinin (kupon-dolu) dosyasında iki kupon
// var: biri bütün ürünlerde, öteki bir üründe. Katalog kurulmadan kurulunca ürün bulunamaz: o kupon yazılmaz ve döner.
// Sitede kupon satırı varsa (silinmiş bile olsa) hiçbir şey yazılmaz; aynı anda üç kurulumdan biri yazar.
import { resolve } from "node:path";
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { baglantiyiKapat } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { kuponBaslangiciniKur } from "../baslangic.ts";
import { kuponlar } from "../model.ts";

const site = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/kupon-dolu"),
);

const temizlenecekler: (() => Promise<void>)[] = [];
afterEach(async () => {
  await baglantiyiKapat();
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

const ac = async () => {
  const deneme = await denemeSitesiAc("kuponbaslangic");
  temizlenecekler.push(deneme.sil);
  return deneme.vt;
};

describe("başlangıç kuponları", () => {
  it("kapsamı bulunan kupon yazılır ve kayda başlangıç adıyla girer; bulunamayan atlanıp döner; ikinci kurulum yazmaz", async () => {
    const vt = await ac();
    expect(await kuponBaslangiciniKur(vt, site)).toEqual({
      sonuc: "yazildi",
      atlananlar: ["URUN50"],
    });
    const yazilan = await vt.select().from(kuponlar);
    expect(yazilan.map((k) => [k.kod, k.tur, k.deger])).toEqual([["YAZ10", "yuzde", 10]]);
    const kayitlar = await vt.select().from(degisiklikKayitlari);
    expect(kayitlar).toEqual([
      expect.objectContaining({ islem: "kupon.eklendi", kim_adi: "baslangic-kupon" }),
    ]);
    expect(await kuponBaslangiciniKur(vt, site)).toEqual({ sonuc: "kurulu" });
  });

  it("silinmiş kuponu olan site kurulu sayılır; dosyası boş site hiçbir şey yazmaz", async () => {
    const vt = await ac();
    await vt.execute(
      sql`insert into kuponlar (kod, tur, deger, kapsam, silinme_zamani) values ('ESKI1', 'yuzde', 5, 'hepsi', now())`,
    );
    expect(await kuponBaslangiciniKur(vt, site)).toEqual({ sonuc: "kurulu" });
    expect(await kuponBaslangiciniKur(vt, { ...site, kuponBaslangici: [] })).toEqual({
      sonuc: "kurulu",
    });
  });

  it("aynı anda üç kurulumdan yalnız biri yazar", async () => {
    const vt = await ac();
    const sonuclar = await Promise.all([1, 2, 3].map(() => kuponBaslangiciniKur(vt, site)));
    expect(sonuclar.filter((sonuc) => sonuc.sonuc === "yazildi")).toHaveLength(1);
    expect(await vt.select().from(kuponlar)).toHaveLength(1);
  });
});
