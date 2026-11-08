// Stok servisi gerçek veritabanıyla (kart 0082, karar 0068): aynı anda giden düşürmelerde son ürünün bir
// kez düşmesi (gerçekten aynı anda: ikinci istek kilitte beklerken görülür), çağıranın işlemiyle birlikte
// geri alınma, takibi kapalı ürün, geçmişin değiştirilememesi, elle düzeltmenin sebebi, notu ve çakışması,
// iptal ve iadede artırma, ters sırada kalemlerle kilitlenmeme ve iki sitenin ayrı kalması.
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { eq, sql } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { elleStokSebepleri, stokSebepAdlari } from "../../../kayitlar/stok.ts";
import { baglan, type Veritabani } from "../../../veritabani/baglanti.ts";
import { yoneticiAdresi } from "../../../veritabani/testler/adresler.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { urunServisi } from "../../urun/servis.ts";
import { birimStoklari, stokGecmisi } from "../model.ts";
import { enCokStok } from "../semalar.ts";
import { stokServisi } from "../servis.ts";

const servis = stokServisi();
const urunler = urunServisi(() => "Europe/Istanbul");

const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });
const musteri = (): DegisikligiYapan => ({ tur: "musteri", kimlik: randomUUID() });

const silinecekler: (() => Promise<void>)[] = [];
const siteAc = async (): Promise<Veritabani> => {
  const site = await denemeSitesiAc("stok");
  silinecekler.push(site.sil);
  return site.vt;
};
afterEach(async () => {
  await Promise.all(silinecekler.splice(0).map((sil) => sil()));
});

// Yeni ürün, tek birimi ve istenirse başlangıç stoğu (elle düzeltmeyle).
const birimAc = async (vt: Veritabani, stok = 0, takip = true) => {
  const urun = await urunler.urunEkle(vt, yonetici(), {
    ad: "Deneme ürünü",
    vergiSinifi: null,
    stokTakibi: takip,
  });
  const birim = (await urunler.urunuOku(vt, urun))?.birimler[0]?.kimlik;
  if (birim === undefined) throw new Error("Birim yok.");
  if (stok > 0) {
    await servis.stokDuzelt(vt, yonetici(), birim, {
      yeniMiktar: stok,
      gorulenMiktar: 0,
      sebep: "yeni-mal",
    });
  }
  return { urun, birim };
};

const hatasi = async (is: Promise<unknown>) => {
  const hata = await is.then(
    () => undefined,
    (yakalanan: unknown) => yakalanan,
  );
  if (!(hata instanceof BilinenHata)) throw new Error(`Bilinen hata beklenirdi: ${String(hata)}`);
  return { kod: hata.kod, ayrinti: hata.ayrinti };
};

const miktari = async (vt: Veritabani, birim: string) =>
  (await servis.stoklariOku(vt, [birim])).get(birim)?.miktar;
const gecmis = (vt: Veritabani, birim: string) =>
  vt
    .select()
    .from(stokGecmisi)
    .where(eq(stokGecmisi.birim_kimligi, birim))
    .orderBy(stokGecmisi.zaman);
const kayitlar = (vt: Veritabani, birim: string) =>
  vt.select().from(degisiklikKayitlari).where(eq(degisiklikKayitlari.kayit_kimligi, birim));

// Sipariş akışının yerine: düşürmeyi kendi işleminde çalıştırır.
const siparisVer = (vt: Veritabani, kalemler: { birim: string; adet: number }[], kim = musteri()) =>
  vt.transaction((islem) =>
    servis.stokDus(islem, kim, kalemler, { sebep: "siparis", kaynak: randomUUID() }),
  );

// Bu veritabanında kilit bekleyen bir sorgu görünene kadar bekler. Site kullanıcısı öteki oturumları
// göremez (karar 0053): gözlem yönetici bağlantısıyla yapılır.
const kilitBekleyeniGor = async (vt: Veritabani) => {
  const ad = (await vt.execute<{ ad: string }>(sql`select current_database() as ad`)).rows[0]?.ad;
  const yonetici = baglan(yoneticiAdresi("postgres"));
  try {
    // Yüklü kontrol hattında da yetsin: en çok 20 saniye (kart 0082 kontrolü).
    for (let deneme = 0; deneme < 800; deneme++) {
      const sonuc = await yonetici.execute<{ sayi: number }>(
        sql`select count(*)::int as sayi from pg_stat_activity where datname = ${ad} and wait_event_type = 'Lock'`,
      );
      if ((sonuc.rows[0]?.sayi ?? 0) > 0) return;
      await new Promise((bitti) => setTimeout(bitti, 25));
    }
    throw new Error("Kilit bekleyen sorgu görülmedi.");
  } finally {
    await yonetici.$client.end();
  }
};

describe("kayıt dosyası", () => {
  it("veritabanının sebep denetimi kayıttaki sebeplerle aynı", async () => {
    const vt = await siteAc();
    const sonuc = await vt.execute<{ tanim: string }>(
      sql`select pg_get_constraintdef(oid) as tanim from pg_constraint where conname = 'stok_gecmisi_sebep'`,
    );
    const tanim = sonuc.rows[0]?.tanim ?? "";
    const veritabanindaki = [...tanim.matchAll(/'([^']+)'/g)].map((eslesme) => eslesme[1]);
    expect(veritabanindaki.toSorted()).toEqual([...stokSebepAdlari].toSorted());
    expect(elleStokSebepleri).toEqual([
      "sayim",
      "yeni-mal",
      "hasarli-kayip",
      "iade-edilen",
      "diger",
    ]);
  });

  it("değişiklik dosyası görevliye stok izinlerini verir", () => {
    const dosya = readFileSync(
      new URL("../../../veritabani/degisiklikler/0019_stok.sql", import.meta.url),
      "utf8",
    );
    expect(dosya.split("\n")[0]).toMatch(/^-- Geri dönüş: /);
    expect(dosya).toContain("'stok.gor' FROM \"roller\" WHERE \"kod\" = 'gorevli'");
    expect(dosya).toContain("'stok.duzelt' FROM \"roller\" WHERE \"kod\" = 'gorevli'");
  });
});

describe("okuma", () => {
  it("yeni üründe takip açık ve stok sıfır; birimler tek sorguyla gelir", async () => {
    const vt = await siteAc();
    const birimler = await Promise.all([birimAc(vt), birimAc(vt, 4), birimAc(vt, 0, false)]);
    const urun = await urunler.urunuOku(vt, (await birimAc(vt)).urun);
    expect(urun?.stokTakibi).toBe(true);
    const sorgu = vi.spyOn(vt.$client, "query");
    const sonuc = await servis.stoklariOku(vt, [
      ...birimler.map((b) => b.birim),
      randomUUID(),
      "bozuk",
    ]);
    expect(sorgu).toHaveBeenCalledTimes(1);
    sorgu.mockRestore();
    expect(birimler.map(({ birim }) => sonuc.get(birim))).toEqual([
      { miktar: 0, takip: true },
      { miktar: 4, takip: true },
      { miktar: 0, takip: false },
    ]);
    expect(sonuc.size).toBe(3);
  });
});

describe("düşürme", () => {
  it("stoğu 1 olan birime aynı anda giden iki düşürmeden yalnız biri geçer", async () => {
    const vt = await siteAc();
    const { birim } = await birimAc(vt, 1);
    let birinciBitti = false;
    // Birinci sipariş stoğu düşürür ve işlemini açık tutar; ikinci sipariş aynı satırı ister ve
    // kilitte bekler. İkincinin beklediği görülünce birinci kaydedilir.
    let ikinci: Promise<unknown> = Promise.resolve();
    await vt.transaction(async (islem) => {
      await servis.stokDus(islem, musteri(), [{ birim, adet: 1 }], { sebep: "siparis" });
      ikinci = siparisVer(vt, [{ birim, adet: 1 }]).then(
        () => "gecti",
        (hata: unknown) => hata,
      );
      await kilitBekleyeniGor(vt);
      birinciBitti = true;
    });
    const sonuc = await ikinci;
    expect(birinciBitti).toBe(true);
    expect(sonuc).toBeInstanceOf(BilinenHata);
    expect((sonuc as BilinenHata).ayrinti).toEqual([
      { alan: "kalemler", kod: "stok-yetersiz", birim },
    ]);
    expect(await miktari(vt, birim)).toBe(0);
    const satirlar = await gecmis(vt, birim);
    expect(satirlar.map((s) => [s.sebep, s.onceki_miktar, s.sonraki_miktar])).toEqual([
      ["yeni-mal", 0, 1],
      ["siparis", 1, 0],
    ]);
  });

  it("aynı anda on sipariş üç stoğu üç kez düşer", async () => {
    const vt = await siteAc();
    const { birim } = await birimAc(vt, 3);
    const sonuclar = await Promise.allSettled(
      Array.from({ length: 10 }, () => siparisVer(vt, [{ birim, adet: 1 }])),
    );
    expect(sonuclar.filter((s) => s.status === "fulfilled")).toHaveLength(3);
    expect(await miktari(vt, birim)).toBe(0);
    expect((await gecmis(vt, birim)).filter((s) => s.sebep === "siparis")).toHaveLength(3);
  });

  it("işlem geri alınınca stok ve geçmiş birlikte geri döner", async () => {
    const vt = await siteAc();
    const { birim } = await birimAc(vt, 5);
    await expect(
      vt.transaction(async (islem) => {
        await servis.stokDus(islem, musteri(), [{ birim, adet: 2 }], { sebep: "siparis" });
        throw new Error("Sipariş yazılamadı.");
      }),
    ).rejects.toThrow("Sipariş yazılamadı.");
    expect(await miktari(vt, birim)).toBe(5);
    expect(await gecmis(vt, birim)).toHaveLength(1);
  });

  it("bir kalem yetmezse hiçbiri düşmez; çağıranın işlemi sürebilir", async () => {
    const vt = await siteAc();
    const a = await birimAc(vt, 5);
    const b = await birimAc(vt, 1);
    const silinen = await birimAc(vt, 3);
    await urunler.urunSil(vt, yonetici(), silinen.urun);
    await vt.transaction(async (islem) => {
      const hata = await hatasi(
        servis.stokDus(
          islem,
          musteri(),
          [
            { birim: a.birim, adet: 2 },
            { birim: b.birim, adet: 2 },
            { birim: silinen.birim, adet: 1 },
            { birim: randomUUID(), adet: 1 },
          ],
          { sebep: "siparis" },
        ),
      );
      expect(hata.kod).toBe("cakisma");
      expect(hata.ayrinti).toHaveLength(3);
      expect(hata.ayrinti).toContainEqual({
        alan: "kalemler",
        kod: "stok-yetersiz",
        birim: b.birim,
      });
      expect(hata.ayrinti).toContainEqual({
        alan: "kalemler",
        kod: "birim-gecersiz",
        birim: silinen.birim,
      });
      // İşlem bozulmadı: başka bir kalemle sürer.
      await servis.stokDus(islem, musteri(), [{ birim: a.birim, adet: 1 }], { sebep: "siparis" });
    });
    expect(await miktari(vt, a.birim)).toBe(4);
    expect(await miktari(vt, b.birim)).toBe(1);
    expect(await miktari(vt, silinen.birim)).toBe(3);
  });

  it("aynı birimin kalemleri toplanır, geçmişe kim ve kaynakla bir satır yazılır", async () => {
    const vt = await siteAc();
    const { birim } = await birimAc(vt, 5);
    const kim = musteri();
    const kaynak = randomUUID();
    await vt.transaction((islem) =>
      servis.stokDus(
        islem,
        kim,
        [
          { birim, adet: 2 },
          { birim, adet: 2 },
        ],
        { sebep: "siparis", kaynak },
      ),
    );
    expect(await miktari(vt, birim)).toBe(1);
    const [, satir] = await servis.stokGecmisiniOku(vt, birim).then((s) => s.toReversed());
    expect(satir).toMatchObject({
      oncekiMiktar: 5,
      sonrakiMiktar: 1,
      sebep: "siparis",
      kaynak,
      kim,
      not: null,
    });
    // Siparişin düşürmesi değişiklik kaydına girmez, elle düzeltme girer.
    expect((await kayitlar(vt, birim)).map((k) => k.islem)).toEqual(["stok.duzeltildi"]);
  });

  it("stok satırı olmayan birimde düşürme yetersizdir", async () => {
    const vt = await siteAc();
    const { birim } = await birimAc(vt);
    expect((await hatasi(siparisVer(vt, [{ birim, adet: 1 }]))).kod).toBe("cakisma");
    expect(await gecmis(vt, birim)).toHaveLength(0);
  });

  it("takibi kapalı üründe düşürme stoğu değiştirmez, geçmişe yazmaz", async () => {
    const vt = await siteAc();
    const { urun, birim } = await birimAc(vt, 2);
    await urunler.urunDegistir(vt, yonetici(), urun, { stokTakibi: false });
    await siparisVer(vt, [{ birim, adet: 10 }]);
    expect(await servis.stoklariOku(vt, [birim]).then((s) => s.get(birim))).toEqual({
      miktar: 2,
      takip: false,
    });
    expect(await gecmis(vt, birim)).toHaveLength(1);
    const degisiklik = (await kayitlar(vt, urun)).find((k) => k.islem === "urun.degisti");
    expect(degisiklik?.yeni_deger).toEqual({ stokTakibi: false });
  });

  it("açık duran düşürme bitmeden ürünün takibi değişmez", async () => {
    const vt = await siteAc();
    const { urun, birim } = await birimAc(vt, 2);
    const sira: string[] = [];
    let degisiklik: Promise<unknown> = Promise.resolve();
    await vt.transaction(async (islem) => {
      await servis.stokDus(islem, musteri(), [{ birim, adet: 1 }], { sebep: "siparis" });
      degisiklik = urunler
        .urunDegistir(vt, yonetici(), urun, { stokTakibi: false })
        .then(() => sira.push("degisiklik"));
      await kilitBekleyeniGor(vt);
      sira.push("siparis");
    });
    await degisiklik;
    expect(sira).toEqual(["siparis", "degisiklik"]);
    expect(await servis.stoklariOku(vt, [birim]).then((s) => s.get(birim))).toEqual({
      miktar: 1,
      takip: false,
    });
  });

  it("ters sırada kalem veren iki sipariş birbirini kilitlemez", async () => {
    const vt = await siteAc();
    const a = await birimAc(vt, 50);
    const b = await birimAc(vt, 50);
    const siparisler = Array.from({ length: 20 }, (_, sira) =>
      siparisVer(
        vt,
        sira % 2 === 0
          ? [
              { birim: a.birim, adet: 1 },
              { birim: b.birim, adet: 1 },
            ]
          : [
              { birim: b.birim, adet: 1 },
              { birim: a.birim, adet: 1 },
            ],
      ),
    );
    await Promise.all(siparisler);
    expect(await miktari(vt, a.birim)).toBe(30);
    expect(await miktari(vt, b.birim)).toBe(30);
  });

  it("bozuk girdi doğrulama hatası alır", async () => {
    const vt = await siteAc();
    const { birim } = await birimAc(vt, 2);
    expect((await hatasi(siparisVer(vt, [{ birim, adet: 0 }]))).ayrinti).toEqual([
      { alan: "0.adet", kod: "adet-bicimi" },
    ]);
    expect((await hatasi(siparisVer(vt, []))).kod).toBe("dogrulama");
    expect(
      (
        await hatasi(
          vt.transaction((islem) =>
            servis.stokDus(islem, musteri(), [{ birim, adet: 1 }], {
              sebep: "siparis",
              kaynak: "bozuk",
            }),
          ),
        )
      ).kod,
    ).toBe("dogrulama");
    expect(await miktari(vt, birim)).toBe(2);
  });
});

describe("artırma", () => {
  it("iptal ve iadede artar; satırı olmayan ve silinmiş birimde de; takip kapalıysa değişmez", async () => {
    const vt = await siteAc();
    const dolu = await birimAc(vt, 2);
    const bos = await birimAc(vt);
    const silinen = await birimAc(vt, 1);
    const kapali = await birimAc(vt, 0, false);
    await urunler.urunSil(vt, yonetici(), silinen.urun);
    const kaynak = randomUUID();
    await vt.transaction(async (islem) => {
      await servis.stokArtir(
        islem,
        yonetici(),
        [
          { birim: dolu.birim, adet: 3 },
          { birim: bos.birim, adet: 1 },
          { birim: silinen.birim, adet: 1 },
          { birim: kapali.birim, adet: 5 },
        ],
        { sebep: "siparis-iptali", kaynak },
      );
    });
    const stoklar = await servis.stoklariOku(
      vt,
      [dolu, bos, silinen, kapali].map((b) => b.birim),
    );
    expect(stoklar.get(dolu.birim)?.miktar).toBe(5);
    expect(stoklar.get(bos.birim)?.miktar).toBe(1);
    expect(stoklar.get(silinen.birim)?.miktar).toBe(2);
    expect(stoklar.get(kapali.birim)?.miktar).toBe(0);
    expect(await gecmis(vt, kapali.birim)).toHaveLength(0);
    const [son] = await servis.stokGecmisiniOku(vt, bos.birim);
    expect(son).toMatchObject({
      oncekiMiktar: 0,
      sonrakiMiktar: 1,
      sebep: "siparis-iptali",
      kaynak,
    });
  });

  it("olmayan birim reddedilir, hiçbir kalem artmaz", async () => {
    const vt = await siteAc();
    const { birim } = await birimAc(vt, 1);
    const hata = await hatasi(
      vt.transaction((islem) =>
        servis.stokArtir(
          islem,
          yonetici(),
          [
            { birim, adet: 1 },
            { birim: randomUUID(), adet: 1 },
          ],
          { sebep: "siparis-iadesi" },
        ),
      ),
    );
    expect(hata.kod).toBe("cakisma");
    expect(await miktari(vt, birim)).toBe(1);
  });
});

describe("elle düzeltme", () => {
  it("yeni miktar sebebiyle geçmişe ve değişiklik kaydına yazılır", async () => {
    const vt = await siteAc();
    const { birim } = await birimAc(vt);
    const kim = yonetici();
    await servis.stokDuzelt(vt, kim, birim, {
      yeniMiktar: 7,
      gorulenMiktar: 0,
      sebep: "diger",
      not: "Fuar dönüşü",
    });
    expect(await miktari(vt, birim)).toBe(7);
    const [satir] = await servis.stokGecmisiniOku(vt, birim);
    expect(satir).toMatchObject({
      oncekiMiktar: 0,
      sonrakiMiktar: 7,
      sebep: "diger",
      not: "Fuar dönüşü",
      kim,
    });
    const [kayit] = await kayitlar(vt, birim);
    expect(kayit).toMatchObject({
      islem: "stok.duzeltildi",
      kayit_turu: "stok",
      kim_kimligi: kim.tur === "sistem" ? null : kim.kimlik,
      eski_deger: { miktar: 0 },
      yeni_deger: { miktar: 7, sebep: "diger", not: "Fuar dönüşü" },
    });
  });

  it("görülen miktar değiştiyse reddedilir, hiçbir şey yazılmaz", async () => {
    const vt = await siteAc();
    const { birim } = await birimAc(vt, 5);
    await siparisVer(vt, [{ birim, adet: 1 }]);
    const hata = await hatasi(
      servis.stokDuzelt(vt, yonetici(), birim, {
        yeniMiktar: 10,
        gorulenMiktar: 5,
        sebep: "sayim",
      }),
    );
    expect(hata).toEqual({
      kod: "cakisma",
      ayrinti: [{ alan: "gorulenMiktar", kod: "stok-degisti" }],
    });
    expect(await miktari(vt, birim)).toBe(4);
    expect(await gecmis(vt, birim)).toHaveLength(2);
    expect(await kayitlar(vt, birim)).toHaveLength(1);
  });

  it("aynı kalan miktar hiçbir yere yazılmaz", async () => {
    const vt = await siteAc();
    const { birim } = await birimAc(vt, 3);
    await servis.stokDuzelt(vt, yonetici(), birim, {
      yeniMiktar: 3,
      gorulenMiktar: 3,
      sebep: "sayim",
    });
    expect(await gecmis(vt, birim)).toHaveLength(1);
    expect(await kayitlar(vt, birim)).toHaveLength(1);
  });

  it("'diğer' notsuz, eksi miktar, elle seçilemeyen sebep ve kayda uygun olmayan not reddedilir", async () => {
    const vt = await siteAc();
    const { birim } = await birimAc(vt, 3);
    const dene = (girdi: Parameters<typeof servis.stokDuzelt>[3]) =>
      hatasi(servis.stokDuzelt(vt, yonetici(), birim, girdi));
    expect(await dene({ yeniMiktar: 1, gorulenMiktar: 3, sebep: "diger" })).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "not", kod: "not-gerekli" }],
    });
    expect(await dene({ yeniMiktar: -1, gorulenMiktar: 3, sebep: "sayim" })).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "yeniMiktar", kod: "miktar-bicimi" }],
    });
    expect(
      (await dene({ yeniMiktar: 1, gorulenMiktar: 3, sebep: "siparis" as "sayim" })).ayrinti,
    ).toEqual([{ alan: "sebep", kod: "invalid_value" }]);
    expect(
      await dene({ yeniMiktar: 1, gorulenMiktar: 3, sebep: "sayim", not: "kisi@ornek.com" }),
    ).toEqual({ kod: "dogrulama", ayrinti: [{ alan: "not", kod: "kayda-uygun-degil" }] });
    expect(await miktari(vt, birim)).toBe(3);
  });

  it("silinmiş, olmayan ve bozuk kimlikli birim bulunamadı; takibi kapalı üründe düzeltilir", async () => {
    const vt = await siteAc();
    const silinen = await birimAc(vt, 1);
    await urunler.urunSil(vt, yonetici(), silinen.urun);
    const girdi = { yeniMiktar: 2, gorulenMiktar: 1, sebep: "sayim" } as const;
    for (const birim of [silinen.birim, randomUUID(), "bozuk"]) {
      expect((await hatasi(servis.stokDuzelt(vt, yonetici(), birim, girdi))).kod).toBe(
        "bulunamadi",
      );
    }
    const kapali = await birimAc(vt, 0, false);
    await servis.stokDuzelt(vt, yonetici(), kapali.birim, { ...girdi, gorulenMiktar: 0 });
    expect(await miktari(vt, kapali.birim)).toBe(2);
  });

  it("değişiklik kaydı yazılamazsa stok ve geçmiş de geri alınır", async () => {
    const vt = await siteAc();
    const { birim } = await birimAc(vt, 2);
    await vt.execute(
      sql`alter table degisiklik_kayitlari add constraint deneme_engel check (islem <> 'stok.duzeltildi') not valid`,
    );
    await expect(
      servis.stokDuzelt(vt, yonetici(), birim, { yeniMiktar: 9, gorulenMiktar: 2, sebep: "sayim" }),
    ).rejects.toThrow();
    expect(await miktari(vt, birim)).toBe(2);
    expect(await gecmis(vt, birim)).toHaveLength(1);
  });
});

describe("sınırlar (kart 0082 kontrolü)", () => {
  it("toplanmış adet sınırı aşarsa reddedilir; artırmanın sonucu sınırı aşamaz", async () => {
    const vt = await siteAc();
    const { birim } = await birimAc(vt, 5);
    const artir = (kalemler: { birim: string; adet: number }[]) =>
      vt.transaction((islem) =>
        servis.stokArtir(islem, yonetici(), kalemler, { sebep: "siparis-iptali" }),
      );
    expect(
      await hatasi(
        artir([
          { birim, adet: enCokStok },
          { birim, adet: 1 },
        ]),
      ),
    ).toEqual({ kod: "dogrulama", ayrinti: [{ alan: "kalemler", kod: "miktar-siniri", birim }] });
    expect(await hatasi(artir([{ birim, adet: enCokStok }]))).toEqual({
      kod: "cakisma",
      ayrinti: [{ alan: "kalemler", kod: "miktar-siniri", birim }],
    });
    expect(await hatasi(artir([{ birim, adet: enCokStok + 1 }]))).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "0.adet", kod: "miktar-siniri" }],
    });
    expect(await miktari(vt, birim)).toBe(5);
    // Sınıra kadar artırılır, sonra panelden düzeltilebilir.
    await artir([{ birim, adet: enCokStok - 5 }]);
    expect(await miktari(vt, birim)).toBe(enCokStok);
    await servis.stokDuzelt(vt, yonetici(), birim, {
      yeniMiktar: 3,
      gorulenMiktar: enCokStok,
      sebep: "sayim",
    });
    expect(await miktari(vt, birim)).toBe(3);
  });

  it("veritabanının üst sınırı servisteki sınırla aynı", async () => {
    const vt = await siteAc();
    const { birim } = await birimAc(vt, 1);
    await vt
      .update(birimStoklari)
      .set({ miktar: enCokStok })
      .where(eq(birimStoklari.birim_kimligi, birim));
    await expect(
      vt
        .update(birimStoklari)
        .set({ miktar: enCokStok + 1 })
        .where(eq(birimStoklari.birim_kimligi, birim)),
    ).rejects.toMatchObject({ cause: { code: "23514" } });
  });

  it("sınırı aşan miktar, boş ve uzun not ekranın tanıdığı kodla döner", async () => {
    const vt = await siteAc();
    const { birim } = await birimAc(vt, 3);
    const dene = (girdi: Parameters<typeof servis.stokDuzelt>[3]) =>
      hatasi(servis.stokDuzelt(vt, yonetici(), birim, girdi));
    expect(await dene({ yeniMiktar: enCokStok + 1, gorulenMiktar: 3, sebep: "sayim" })).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "yeniMiktar", kod: "miktar-siniri" }],
    });
    for (const not of ["", "   "]) {
      expect(await dene({ yeniMiktar: 1, gorulenMiktar: 3, sebep: "diger", not })).toEqual({
        kod: "dogrulama",
        ayrinti: [{ alan: "not", kod: "not-gerekli" }],
      });
    }
    expect(
      await dene({ yeniMiktar: 1, gorulenMiktar: 3, sebep: "sayim", not: "a".repeat(501) }),
    ).toEqual({ kod: "dogrulama", ayrinti: [{ alan: "not", kod: "not-uzun" }] });
    // Boş not başka sebepte yazılmamış sayılır, kırpılan not kırpılmış saklanır.
    await servis.stokDuzelt(vt, yonetici(), birim, {
      yeniMiktar: 2,
      gorulenMiktar: 3,
      sebep: "sayim",
      not: "  ",
    });
    await servis.stokDuzelt(vt, yonetici(), birim, {
      yeniMiktar: 1,
      gorulenMiktar: 2,
      sebep: "sayim",
      not: `  ${"a".repeat(500)}  `,
    });
    const [son, onceki] = await servis.stokGecmisiniOku(vt, birim);
    expect(onceki?.not).toBeNull();
    expect(son?.not).toBe("a".repeat(500));
  });
});

describe("geçmiş", () => {
  it("geçmiş güncellenemez, silinemez, boşaltılamaz", async () => {
    const vt = await siteAc();
    const { birim } = await birimAc(vt, 2);
    // Tetikleyicinin hatası (restrict_violation), başka bir sebeple düşen sorgu değil.
    const kisitlama = { cause: { code: "23001" } };
    await expect(
      vt
        .update(stokGecmisi)
        .set({ sonraki_miktar: 100 })
        .where(eq(stokGecmisi.birim_kimligi, birim)),
    ).rejects.toMatchObject(kisitlama);
    await expect(
      vt.delete(stokGecmisi).where(eq(stokGecmisi.birim_kimligi, birim)),
    ).rejects.toMatchObject(kisitlama);
    await expect(vt.execute(sql`truncate stok_gecmisi`)).rejects.toMatchObject(kisitlama);
    expect(await gecmis(vt, birim)).toHaveLength(1);
  });

  it("veritabanı eksi stoğu ve değişmeyen geçmiş satırını reddeder", async () => {
    const vt = await siteAc();
    const { birim } = await birimAc(vt, 2);
    await expect(
      vt.update(birimStoklari).set({ miktar: -1 }).where(eq(birimStoklari.birim_kimligi, birim)),
    ).rejects.toThrow();
    await expect(
      vt.insert(stokGecmisi).values({
        birim_kimligi: birim,
        onceki_miktar: 2,
        sonraki_miktar: 2,
        sebep: "sayim",
        kim_turu: "sistem",
        kim_adi: "deneme",
      }),
    ).rejects.toThrow();
    await expect(
      vt.insert(stokGecmisi).values({
        birim_kimligi: birim,
        onceki_miktar: 2,
        sonraki_miktar: 3,
        sebep: "uydurma",
        kim_turu: "sistem",
        kim_adi: "deneme",
      }),
    ).rejects.toThrow();
  });

  it("sayfalar en yeni önce gelir, satır kaybolmaz", async () => {
    const vt = await siteAc();
    const { birim } = await birimAc(vt, 10);
    for (let sira = 0; sira < 4; sira++) await siparisVer(vt, [{ birim, adet: 1 }]);
    const ilk = await servis.stokGecmisiniOku(vt, birim, { sinir: 3 });
    expect(ilk.map((s) => s.sonrakiMiktar)).toEqual([6, 7, 8]);
    const sonra = ilk[2]?.kimlik;
    if (sonra === undefined) throw new Error("Sayfa eksik.");
    const sonraki = await servis.stokGecmisiniOku(vt, birim, { sonra, sinir: 3 });
    expect(sonraki.map((s) => s.sonrakiMiktar)).toEqual([9, 10]);
    expect(await servis.stokGecmisiniOku(vt, "bozuk")).toEqual([]);
  });
});

describe("iki site", () => {
  it("bir sitenin stoğu ötekinde görünmez, değiştirilemez", async () => {
    const [a, b] = await Promise.all([siteAc(), siteAc()]);
    const { birim } = await birimAc(a, 3);
    expect((await servis.stoklariOku(b, [birim])).size).toBe(0);
    expect(await servis.stokGecmisiniOku(b, birim)).toEqual([]);
    expect(
      (
        await hatasi(
          servis.stokDuzelt(b, yonetici(), birim, {
            yeniMiktar: 0,
            gorulenMiktar: 3,
            sebep: "sayim",
          }),
        )
      ).kod,
    ).toBe("bulunamadi");
    expect((await hatasi(siparisVer(b, [{ birim, adet: 1 }]))).kod).toBe("cakisma");
    expect(await miktari(a, birim)).toBe(3);
  });
});
