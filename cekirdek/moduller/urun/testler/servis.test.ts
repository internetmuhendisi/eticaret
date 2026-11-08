// Ürün servisi gerçek veritabanıyla (kart 0076, karar 0062): beş yayın durumunun vitrindeki yeri,
// zamanı gelen ürünün kendiliğinden görünmesi, hatalı barkodun, aynı stok kodunun ve aynı adres adının
// reddi, aynı anda iki eklemede tek kazanan, silme işareti, değişiklik kaydı, vergi sınıfı kuralı ve iki
// sitenin birbirinin ürününü görmemesi.
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { urunDurumlari, urunDurumVitrini, vitrinYerleri } from "../../../kayitlar/urun.ts";
import { adresAdiUzunlugu } from "../../../metinler/adres-adi.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { vergiServisi } from "../../vergi/servis.ts";
import { urunBirimleri, urunler } from "../model.ts";
import type { UrunGirdisi } from "../semalar.ts";
import { urunServisi } from "../servis.ts";
import type { VitrinSecenekleri } from "../vitrin.ts";

// Stokla ilgisi olmayan vitrin testleri: tükenen ürün gösterilir (kart 0083).
const goster: VitrinSecenekleri = { tukenenUrun: "goster" };

const saatDilimi = "Europe/Istanbul";
const servis = urunServisi(() => saatDilimi);
const vergi = vergiServisi(() => ({ siniflar: [] }));

const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const silinecekler: (() => Promise<void>)[] = [];
const siteAc = async (): Promise<Veritabani> => {
  const site = await denemeSitesiAc("urun");
  silinecekler.push(site.sil);
  return site.vt;
};
afterEach(async () => {
  await Promise.all(silinecekler.splice(0).map((sil) => sil()));
});

const urun = (ek: Partial<UrunGirdisi> = {}): UrunGirdisi => ({
  ad: "Deneme ürünü",
  vergiSinifi: null,
  ...ek,
});

// Servisin bildiği hata: kodu ve ayrıntısı.
const hatasi = async (is: Promise<unknown>) => {
  const hata = await is.then(
    () => undefined,
    (yakalanan: unknown) => yakalanan,
  );
  if (!(hata instanceof BilinenHata)) throw new Error(`Bilinen hata beklenirdi: ${String(hata)}`);
  return { kod: hata.kod, ayrinti: hata.ayrinti };
};

const kayitlar = (vt: Veritabani, kimlik: string) =>
  vt
    .select()
    .from(degisiklikKayitlari)
    .where(eq(degisiklikKayitlari.kayit_kimligi, kimlik))
    .orderBy(degisiklikKayitlari.zaman);

describe("vitrinde görünür mü", () => {
  it("beş durumun her biri sayfada ve listede kayıttaki gibi görünür", async () => {
    const vt = await siteAc();
    const gecmis = "2020-01-01T00:00";
    for (const durum of urunDurumlari) {
      const kimlik = await servis.urunEkle(
        vt,
        yonetici(),
        urun({
          ad: `Ürün ${durum}`,
          durum,
          ...(durum === "zamanlanmis" ? { yayinZamani: gecmis } : {}),
        }),
      );
      for (const yer of vitrinYerleri) {
        expect([durum, yer, await servis.vitrindeGorunurMu(vt, kimlik, yer, goster)]).toEqual([
          durum,
          yer,
          urunDurumVitrini[durum][yer],
        ]);
      }
    }
  });

  it("beklenen tablo: yayında her yerde, gizli yalnız bağlantıyla, taslak ve arşiv hiçbir yerde", () => {
    expect(urunDurumVitrini).toEqual({
      taslak: { sayfa: false, liste: false, zamanli: false },
      yayinda: { sayfa: true, liste: true, zamanli: false },
      zamanlanmis: { sayfa: true, liste: true, zamanli: true },
      gizli: { sayfa: true, liste: false, zamanli: false },
      arsiv: { sayfa: false, liste: false, zamanli: false },
    });
  });

  it("zamanlanmış ürün zamanından önce görünmez, zamanı gelince kendiliğinden görünür", async () => {
    const vt = await siteAc();
    const kimlik = await servis.urunEkle(
      vt,
      yonetici(),
      urun({ durum: "zamanlanmis", yayinZamani: "2030-05-01T10:00" }),
    );
    // Sitenin saat diliminde 10:00 = 07:00 UTC.
    expect((await servis.urunuOku(vt, kimlik))?.yayinZamani?.toISOString()).toBe(
      "2030-05-01T07:00:00.000Z",
    );
    const once = new Date("2030-05-01T06:59:59.999Z");
    const tam = new Date("2030-05-01T07:00:00.000Z");
    for (const yer of vitrinYerleri) {
      expect(await servis.vitrindeGorunurMu(vt, kimlik, yer, { ...goster, an: once })).toBe(false);
      expect(await servis.vitrindeGorunurMu(vt, kimlik, yer, { ...goster, an: tam })).toBe(true);
      // Veritabanının şimdiki zamanı: 2030 henüz gelmedi.
      expect(await servis.vitrindeGorunurMu(vt, kimlik, yer, goster)).toBe(false);
    }
    // Zamanı geçmiş: veritabanının şimdiki zamanıyla görünür, durumu değiştiren bir iş yok.
    await servis.urunDegistir(vt, yonetici(), kimlik, { yayinZamani: "2020-05-01T10:00" });
    expect(await servis.vitrindeGorunurMu(vt, kimlik, "liste", goster)).toBe(true);
    expect((await servis.urunuOku(vt, kimlik))?.durum).toBe("zamanlanmis");
  });

  it("silinmiş ürün hiçbir yerde görünmez", async () => {
    const vt = await siteAc();
    const kimlik = await servis.urunEkle(vt, yonetici(), urun({ durum: "yayinda" }));
    await servis.urunSil(vt, yonetici(), kimlik);
    for (const yer of vitrinYerleri) {
      expect(await servis.vitrindeGorunurMu(vt, kimlik, yer, goster)).toBe(false);
    }
  });
});

describe("yayın zamanı", () => {
  it("zamanlanmış ürün yayın zamanısız açılamaz, başka durumda zaman silinir", async () => {
    const vt = await siteAc();
    expect(await hatasi(servis.urunEkle(vt, yonetici(), urun({ durum: "zamanlanmis" })))).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "yayinZamani", kod: "yayin-zamani-gerekli" }],
    });
    const kimlik = await servis.urunEkle(
      vt,
      yonetici(),
      urun({ durum: "yayinda", yayinZamani: "2030-01-01T00:00" }),
    );
    expect((await servis.urunuOku(vt, kimlik))?.yayinZamani).toBeUndefined();
  });

  it("zamanlanmıştan yayına geçince zaman silinir, zamanlanmışa zamansız geçilemez", async () => {
    const vt = await siteAc();
    const kimlik = await servis.urunEkle(
      vt,
      yonetici(),
      urun({ durum: "zamanlanmis", yayinZamani: "2030-01-01T00:00" }),
    );
    await servis.urunDegistir(vt, yonetici(), kimlik, { durum: "yayinda" });
    expect((await servis.urunuOku(vt, kimlik))?.yayinZamani).toBeUndefined();
    expect(
      await hatasi(servis.urunDegistir(vt, yonetici(), kimlik, { durum: "zamanlanmis" })),
    ).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "yayinZamani", kod: "yayin-zamani-gerekli" }],
    });
  });

  it("saat diliminde olmayan saat ve bozuk biçim reddedilir", async () => {
    const vt = await siteAc();
    const berlin = urunServisi(() => "Europe/Berlin");
    expect(
      await hatasi(
        berlin.urunEkle(
          vt,
          yonetici(),
          urun({ durum: "zamanlanmis", yayinZamani: "2026-03-29T02:30" }),
        ),
      ),
    ).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "yayinZamani", kod: "yayin-zamani-gecersiz" }],
    });
    expect(
      await hatasi(
        servis.urunEkle(vt, yonetici(), urun({ durum: "zamanlanmis", yayinZamani: "yarın" })),
      ),
    ).toEqual({ kod: "dogrulama", ayrinti: [{ alan: "yayinZamani", kod: "yayin-zamani-bicimi" }] });
  });

  it("veritabanı da zamanlanmış olmayan üründe zamanı ve zamansız zamanlanmışı reddeder", async () => {
    const vt = await siteAc();
    const kimlik = await servis.urunEkle(vt, yonetici(), urun({ durum: "yayinda" }));
    await expect(
      vt.update(urunler).set({ yayin_zamani: new Date() }).where(eq(urunler.kimlik, kimlik)),
    ).rejects.toThrow();
    await expect(
      vt.update(urunler).set({ durum: "zamanlanmis" }).where(eq(urunler.kimlik, kimlik)),
    ).rejects.toThrow();
  });
});

describe("tekillik ve barkod", () => {
  it("hatalı barkod reddedilir, geçerlisi boşluksuz saklanır", async () => {
    const vt = await siteAc();
    expect(
      await hatasi(servis.urunEkle(vt, yonetici(), urun({ barkod: "4006381333932" }))),
    ).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "barkod", kod: "barkod" }],
    });
    const kimlik = await servis.urunEkle(vt, yonetici(), urun({ barkod: "4006381 333931" }));
    expect((await servis.urunuOku(vt, kimlik))?.birimler[0]?.barkod).toBe("4006381333931");
    expect(
      await hatasi(servis.urunDegistir(vt, yonetici(), kimlik, { barkod: "0-306-40615-3" })),
    ).toEqual({ kod: "dogrulama", ayrinti: [{ alan: "barkod", kod: "barkod" }] });
  });

  it("aynı stok kodu büyük küçük harf ayrımı olmadan reddedilir, ekleme de değiştirme de", async () => {
    const vt = await siteAc();
    await servis.urunEkle(vt, yonetici(), urun({ ad: "Bir", stokKodu: "ABC-1" }));
    const beklenen = { kod: "cakisma", ayrinti: [{ alan: "stokKodu", kod: "stok-kodu-tekrar" }] };
    expect(
      await hatasi(servis.urunEkle(vt, yonetici(), urun({ ad: "İki", stokKodu: "abc-1" }))),
    ).toEqual(beklenen);
    const iki = await servis.urunEkle(vt, yonetici(), urun({ ad: "İki", stokKodu: "ABC-2" }));
    expect(await hatasi(servis.urunDegistir(vt, yonetici(), iki, { stokKodu: "Abc-1" }))).toEqual(
      beklenen,
    );
    // Kendi kodunun yazılışını değiştirmek tekrar sayılmaz.
    await servis.urunDegistir(vt, yonetici(), iki, { stokKodu: "abc-2" });
    expect((await servis.urunuOku(vt, iki))?.birimler[0]?.stokKodu).toBe("abc-2");
  });

  it("aynı adres adı reddedilir; verilmeyen ad addan üretilir ve çakışırsa sayı alır", async () => {
    const vt = await siteAc();
    const bir = await servis.urunEkle(vt, yonetici(), urun({ ad: "Çiçekli Şal" }));
    const iki = await servis.urunEkle(vt, yonetici(), urun({ ad: "Çiçekli şal" }));
    const uc = await servis.urunEkle(vt, yonetici(), urun({ ad: "ÇİÇEKLİ ŞAL" }));
    const adlar = await Promise.all([bir, iki, uc].map((k) => servis.urunuOku(vt, k)));
    expect(adlar.map((u) => u?.adresAdi)).toEqual([
      "cicekli-sal",
      "cicekli-sal-2",
      "cicekli-sal-3",
    ]);
    const beklenen = { kod: "cakisma", ayrinti: [{ alan: "adresAdi", kod: "adres-adi-tekrar" }] };
    expect(
      await hatasi(servis.urunEkle(vt, yonetici(), urun({ adresAdi: "cicekli-sal-2" }))),
    ).toEqual(beklenen);
    expect(
      await hatasi(servis.urunDegistir(vt, yonetici(), uc, { adresAdi: "cicekli-sal" })),
    ).toEqual(beklenen);
    expect(
      await hatasi(servis.urunEkle(vt, yonetici(), urun({ adresAdi: "Çiçekli Şal" }))),
    ).toEqual({ kod: "dogrulama", ayrinti: [{ alan: "adresAdi", kod: "adres-adi-bicimi" }] });
  });

  // Kart 0076 kontrolü: uzun kökte sayılı aday kökü kısaltır, önekle arama onu bulamıyordu.
  it("uzun adla eklenen ürünler sınırı aşmadan ayrı adres adı alır, elle verilen kısaltılmış ad da sayılır", async () => {
    const vt = await siteAc();
    const uzun = "a".repeat(150);
    const kok = "a".repeat(adresAdiUzunlugu);
    const elle = `${"a".repeat(adresAdiUzunlugu - 2)}-3`;
    await servis.urunEkle(vt, yonetici(), urun({ ad: "Elle", adresAdi: elle }));
    const kimlikler = [];
    for (let sira = 0; sira < 4; sira += 1) {
      kimlikler.push(await servis.urunEkle(vt, yonetici(), urun({ ad: uzun })));
    }
    const adlar = await Promise.all(
      kimlikler.map(async (k) => (await servis.urunuOku(vt, k))?.adresAdi),
    );
    expect(adlar).toEqual([
      kok,
      `${"a".repeat(adresAdiUzunlugu - 2)}-2`,
      `${"a".repeat(adresAdiUzunlugu - 2)}-4`,
      `${"a".repeat(adresAdiUzunlugu - 2)}-5`,
    ]);
  });

  it("ad değişince adres adı değişmez; Latin dışı addan kimlikle üretilir", async () => {
    const vt = await siteAc();
    const kimlik = await servis.urunEkle(vt, yonetici(), urun({ ad: "Mavi Kupa" }));
    await servis.urunDegistir(vt, yonetici(), kimlik, { ad: "Kırmızı Kupa" });
    expect((await servis.urunuOku(vt, kimlik))?.adresAdi).toBe("mavi-kupa");
    const cay = await servis.urunEkle(vt, yonetici(), urun({ ad: "茶" }));
    expect((await servis.urunuOku(vt, cay))?.adresAdi).toBe(cay.split("-")[0]);
  });

  it("silinen ürünün stok kodu ve adres adı yeniden kullanılabilir", async () => {
    const vt = await siteAc();
    const eski = await servis.urunEkle(vt, yonetici(), urun({ ad: "Kupa", stokKodu: "K-1" }));
    await servis.urunSil(vt, yonetici(), eski);
    const yeni = await servis.urunEkle(vt, yonetici(), urun({ ad: "Kupa", stokKodu: "K-1" }));
    expect((await servis.urunuOku(vt, yeni))?.adresAdi).toBe("kupa");
    expect((await servis.urunuOku(vt, eski))?.silindi).toBe(true);
  });

  it("aynı anda iki eklemede aynı stok kodunu ve adres adını yalnız biri alır", async () => {
    const vt = await siteAc();
    const sonuclar = await Promise.allSettled(
      Array.from({ length: 6 }, (_, sira) =>
        servis.urunEkle(vt, yonetici(), urun({ ad: `Yarış ${sira}`, stokKodu: "YARIS" })),
      ),
    );
    expect(sonuclar.filter((sonuc) => sonuc.status === "fulfilled")).toHaveLength(1);
    for (const sonuc of sonuclar.filter((s) => s.status === "rejected")) {
      expect((sonuc as PromiseRejectedResult).reason).toBeInstanceOf(BilinenHata);
    }
    const adli = await Promise.allSettled(
      Array.from({ length: 6 }, () =>
        servis.urunEkle(vt, yonetici(), urun({ ad: "Aynı ad", adresAdi: "ayni-ad" })),
      ),
    );
    expect(adli.filter((sonuc) => sonuc.status === "fulfilled")).toHaveLength(1);
    const uretilen = await Promise.all(
      Array.from({ length: 6 }, () => servis.urunEkle(vt, yonetici(), urun({ ad: "Kalem" }))),
    );
    const adresler = await Promise.all(uretilen.map((k) => servis.urunuOku(vt, k)));
    expect(new Set(adresler.map((u) => u?.adresAdi)).size).toBe(6);
  });

  it("veritabanı da silinmemiş iki birimde aynı stok kodunu reddeder", async () => {
    const vt = await siteAc();
    const kimlik = await servis.urunEkle(vt, yonetici(), urun({ stokKodu: "DB-1" }));
    await expect(
      vt.insert(urunBirimleri).values({ urun_kimligi: kimlik, stok_kodu: "db-1" }),
    ).rejects.toThrow();
  });
});

describe("alanlar", () => {
  it("bütün alanlar yazılır ve okunur, ürünün tek birimi olur", async () => {
    const vt = await siteAc();
    const sinif = await vergi.sinifEkle(vt, yonetici(), { ad: "Genel" });
    const kimlik = await servis.urunEkle(vt, yonetici(), {
      ad: "Tam ürün",
      kisaAciklama: "Kısa",
      uzunAciklama: "Uzun açıklama. Soru için destek@ornek.test adresine yazın.",
      adresAdi: "tam-urun",
      durum: "gizli",
      kargoGerekmez: true,
      stokTakibi: false,
      enAzAdet: 2,
      enCokAdet: 10,
      vergiSinifi: sinif,
      stokKodu: "TAM-1",
      barkod: "96385074",
      agirlikGram: 1250,
      enMm: 100,
      boyMm: 200,
      yukseklikMm: 30,
    });
    const okunan = await servis.urunuOku(vt, kimlik);
    expect(okunan).toEqual({
      kimlik,
      ad: "Tam ürün",
      kisaAciklama: "Kısa",
      uzunAciklama: "Uzun açıklama. Soru için destek@ornek.test adresine yazın.",
      adresAdi: "tam-urun",
      durum: "gizli",
      kargoGerekmez: true,
      stokTakibi: false,
      enAzAdet: 2,
      enCokAdet: 10,
      vergiSinifi: sinif,
      kategoriler: [],
      etiketler: [],
      marka: null,
      ilgiliUrunler: [],
      ozellikler: [],
      silindi: false,
      tur: "basit",
      secenekler: [],
      birimler: [
        {
          kimlik: expect.any(String),
          stokKodu: "TAM-1",
          barkod: "96385074",
          agirlikGram: 1250,
          enMm: 100,
          boyMm: 200,
          yukseklikMm: 30,
          sira: 0,
          degerler: [],
          silindi: false,
        },
      ],
      galeri: [],
    });
  });

  it("varsayılanlar: taslak, kargo gerekir, stok takibi açık, en az bir adet, vergisiz", async () => {
    const vt = await siteAc();
    const okunan = await servis.urunuOku(vt, await servis.urunEkle(vt, yonetici(), urun()));
    expect(okunan).toMatchObject({
      durum: "taslak",
      kargoGerekmez: false,
      stokTakibi: true,
      enAzAdet: 1,
      vergiSinifi: null,
    });
    expect(okunan?.birimler).toHaveLength(1);
  });

  it("vergi sınıfı zorunlu alandır: verilmeyen girdi reddedilir", async () => {
    const vt = await siteAc();
    const { vergiSinifi: _, ...sinifsiz } = urun();
    expect(
      await hatasi(servis.urunEkle(vt, yonetici(), sinifsiz as unknown as UrunGirdisi)),
    ).toMatchObject({ kod: "dogrulama", ayrinti: [{ alan: "vergiSinifi" }] });
  });

  it("en çok adet en az adetten küçük olamaz, birleşmiş değere bakılır", async () => {
    const vt = await siteAc();
    const beklenen = { kod: "dogrulama", ayrinti: [{ alan: "enCokAdet", kod: "adet-siniri" }] };
    expect(
      await hatasi(servis.urunEkle(vt, yonetici(), urun({ enAzAdet: 5, enCokAdet: 4 }))),
    ).toEqual(beklenen);
    const kimlik = await servis.urunEkle(vt, yonetici(), urun({ enAzAdet: 2, enCokAdet: 4 }));
    expect(await hatasi(servis.urunDegistir(vt, yonetici(), kimlik, { enAzAdet: 5 }))).toEqual(
      beklenen,
    );
    await servis.urunDegistir(vt, yonetici(), kimlik, { enAzAdet: 5, enCokAdet: null });
    expect(await servis.urunuOku(vt, kimlik)).toMatchObject({ enAzAdet: 5 });
    expect((await servis.urunuOku(vt, kimlik))?.enCokAdet).toBeUndefined();
  });

  it("yalnız e-posta ya da giriş başlığından oluşan metin reddedilir, Basic ile başlayan ad geçer", async () => {
    const vt = await siteAc();
    for (const [alan, deger] of [
      ["ad", "satis@ornek.test"],
      ["kisaAciklama", "Bearer abc"],
      ["stokKodu", "Basic YWRtaW46Z2l6bGk="],
    ] as const) {
      expect(await hatasi(servis.urunEkle(vt, yonetici(), urun({ [alan]: deger })))).toEqual({
        kod: "dogrulama",
        ayrinti: [{ alan, kod: "kayda-uygun-degil" }],
      });
    }
    const kimlik = await servis.urunEkle(vt, yonetici(), urun({ ad: "Basic Tişört" }));
    expect((await servis.urunuOku(vt, kimlik))?.ad).toBe("Basic Tişört");
  });
});

describe("vergi sınıfı", () => {
  it("silinmiş ya da olmayan sınıf seçilemez; bağlıyken silinen sınıf üründe kalır", async () => {
    const vt = await siteAc();
    const sinif = await vergi.sinifEkle(vt, yonetici(), { ad: "Genel" });
    const baska = await vergi.sinifEkle(vt, yonetici(), { ad: "Başka" });
    const kimlik = await servis.urunEkle(vt, yonetici(), urun({ vergiSinifi: sinif }));
    await vergi.sinifSil(vt, yonetici(), sinif);
    // Sınıfı değişmeyen değişiklik geçer, ürün silinmiş sınıfa bağlı kalır (karar 0060).
    await servis.urunDegistir(vt, yonetici(), kimlik, { ad: "Yeni ad" });
    expect((await servis.urunuOku(vt, kimlik))?.vergiSinifi).toBe(sinif);
    const beklenen = {
      kod: "dogrulama",
      ayrinti: [{ alan: "vergiSinifi", kod: "vergi-sinifi-gecersiz" }],
    };
    expect(await hatasi(servis.urunEkle(vt, yonetici(), urun({ vergiSinifi: sinif })))).toEqual(
      beklenen,
    );
    expect(
      await hatasi(servis.urunEkle(vt, yonetici(), urun({ vergiSinifi: randomUUID() }))),
    ).toEqual(beklenen);
    await servis.urunDegistir(vt, yonetici(), kimlik, { vergiSinifi: baska });
    expect(
      await hatasi(servis.urunDegistir(vt, yonetici(), kimlik, { vergiSinifi: sinif })),
    ).toEqual(beklenen);
    await servis.urunDegistir(vt, yonetici(), kimlik, { vergiSinifi: null });
    expect((await servis.urunuOku(vt, kimlik))?.vergiSinifi).toBeNull();
  });
});

describe("silme ve değişiklik kaydı", () => {
  it("ekleme, değişiklik ve silme kayda kimin yaptığıyla girer; değişiklikte yalnız değişen alan", async () => {
    const vt = await siteAc();
    const kim = yonetici();
    const kimlik = await servis.urunEkle(vt, kim, urun({ ad: "Kayıtlı", stokKodu: "KY-1" }));
    await servis.urunDegistir(vt, kim, kimlik, { ad: "Kayıtlı", stokKodu: "KY-1" });
    await servis.urunDegistir(vt, kim, kimlik, { ad: "Yeni", durum: "yayinda", agirlikGram: 5 });
    await servis.urunSil(vt, kim, kimlik);
    const satirlar = await kayitlar(vt, kimlik);
    expect(
      satirlar.map((s) => [s.islem, s.kayit_turu, s.kim_kimligi, s.eski_deger, s.yeni_deger]),
    ).toEqual([
      [
        "urun.eklendi",
        "urun",
        kim.tur === "yonetici" ? kim.kimlik : "",
        null,
        {
          ad: "Kayıtlı",
          adresAdi: "kayitli",
          durum: "taslak",
          kargoGerekmez: false,
          stokTakibi: true,
          enAzAdet: 1,
          stokKodu: "KY-1",
        },
      ],
      [
        "urun.degisti",
        "urun",
        kim.tur === "yonetici" ? kim.kimlik : "",
        { ad: "Kayıtlı", durum: "taslak" },
        { ad: "Yeni", durum: "yayinda", agirlikGram: 5 },
      ],
      [
        "urun.silindi",
        "urun",
        kim.tur === "yonetici" ? kim.kimlik : "",
        {
          ad: "Yeni",
          adresAdi: "kayitli",
          durum: "yayinda",
          kargoGerekmez: false,
          stokTakibi: true,
          enAzAdet: 1,
          stokKodu: "KY-1",
          agirlikGram: 5,
        },
        null,
      ],
    ]);
  });

  it("silme işaretle yapılır: ürün ve birimi yerinde, okunur, değiştirilemez ve yeniden silinemez", async () => {
    const vt = await siteAc();
    const kimlik = await servis.urunEkle(vt, yonetici(), urun());
    await servis.urunSil(vt, yonetici(), kimlik);
    const okunan = await servis.urunuOku(vt, kimlik);
    expect(okunan?.silindi).toBe(true);
    expect(okunan?.birimler.map((birim) => birim.silindi)).toEqual([true]);
    expect((await vt.select().from(urunler)).length).toBe(1);
    expect(await hatasi(servis.urunDegistir(vt, yonetici(), kimlik, { ad: "x y" }))).toEqual({
      kod: "bulunamadi",
      ayrinti: undefined,
    });
    expect(await hatasi(servis.urunSil(vt, yonetici(), kimlik))).toMatchObject({
      kod: "bulunamadi",
    });
  });

  it("kayıt yazılamazsa değişiklik de geri alınır", async () => {
    const vt = await siteAc();
    const kimlik = await servis.urunEkle(vt, yonetici(), urun({ ad: "Önce" }));
    // Kimliği UUID olmayan kişi kayıt satırını düşürür; bu, ürün ve birim yazıldıktan sonra olur.
    const yanlisKisi = { tur: "yonetici", kimlik: "uuid-degil" } as const;
    await expect(servis.urunDegistir(vt, yanlisKisi, kimlik, { ad: "Sonra" })).rejects.toThrow();
    expect((await servis.urunuOku(vt, kimlik))?.ad).toBe("Önce");
  });
});

describe("kayıt ve veritabanı aynı", () => {
  it("veritabanındaki durum denetimi kayıttaki durumlarla aynı", async () => {
    const vt = await siteAc();
    const [satir] = (
      await vt.execute(
        sql`select pg_get_constraintdef(oid) as tanim from pg_constraint where conname = 'urunler_durum'`,
      )
    ).rows as { tanim: string }[];
    const yazilan = [...(satir?.tanim ?? "").matchAll(/'([a-z-]+)'/g)].map((e) => e[1]);
    expect(yazilan.toSorted()).toEqual([...urunDurumlari].toSorted());
  });
});

describe("iki site", () => {
  it("bir sitenin ürünü ötekinde görünmez", async () => {
    const [a, b] = await Promise.all([siteAc(), siteAc()]);
    const kimlik = await servis.urunEkle(
      a,
      yonetici(),
      urun({ durum: "yayinda", stokKodu: "AYNI" }),
    );
    expect(await servis.urunuOku(b, kimlik)).toBeUndefined();
    expect(await servis.vitrindeGorunurMu(b, kimlik, "sayfa", goster)).toBe(false);
    expect((await b.select().from(urunler)).length).toBe(0);
    // Aynı stok kodu ve adres adı öteki sitede serbesttir.
    await servis.urunEkle(b, yonetici(), urun({ durum: "yayinda", stokKodu: "AYNI" }));
    expect(await hatasi(servis.urunDegistir(b, yonetici(), kimlik, { ad: "x y" }))).toMatchObject({
      kod: "bulunamadi",
    });
  });
});
