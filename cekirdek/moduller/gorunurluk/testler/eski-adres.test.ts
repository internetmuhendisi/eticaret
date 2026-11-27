// Eski adresler ve adresin çözülmesi gerçek veritabanıyla (kart 0135, karar 0103). Dört türün her biri
// servisleriyle denenir: adı bu olan kayıt, bir ve iki kez değişen adın tek adımda bugünkü ada yönlenmesi,
// eski adın yaşayan başka bir kayda verilmesi, adın başka bir kaydın eski adı olması (en son bırakan kazanır),
// adın eski hâline dönmesi, silinen kayıt, kalıba uymayan ad. Ürünün sayfası açılmayan durumu, tetikleyicinin
// servis dışı yazıda da çalışması, veritabanındaki tür listesinin kayıtla aynı olması ve iki sitenin ayrı
// kalması ayrıca denenir.
//
// Kart 0330 (karar 0193): servis bir türün yaşayan kaydının eski adresini başka kayda vermez. Elle verilen eski adres
// reddedilir, addan üretilen adres sayı alır; silinmiş kaydın eski adresi ve kaydın kendi eski adresi serbesttir.
// Çözücünün "yaşayan kayıt kazanır" kuralı doğrudan veritabanı yazısıyla denenir (dogrudanAdVer).
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { type AdresliKayitTuru, adresliKayitTurleri } from "../../../kayitlar/adres.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { etiketServisi } from "../../etiket/servis.ts";
import { sabitSayfaServisi } from "../../icerik/sayfa.ts";
import { icerikServisi } from "../../icerik/servis.ts";
import { kategoriDegistir, kategoriEkle, kategoriSil } from "../../kategori/servis.ts";
import { markaServisi } from "../../marka/servis.ts";
import { urunServisi } from "../../urun/servis.ts";
import { kayitAdresiniCoz } from "../adres.ts";
import { eskiAdresler } from "../model.ts";

const urunSrv = urunServisi(() => "Europe/Istanbul");
const icerikSrv = icerikServisi(() => "Europe/Istanbul");
const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const silinecekler: (() => Promise<void>)[] = [];
const siteAc = async (): Promise<Veritabani> => {
  const site = await denemeSitesiAc("adres");
  silinecekler.push(site.sil);
  return site.vt;
};
afterEach(async () => {
  await Promise.all(silinecekler.splice(0).map((sil) => sil()));
});

// Her türün tablosu: servisi atlayan doğrudan yazı için (çözücünün kuralı servisin reddettiği durumda denenir).
const tablolar: Record<AdresliKayitTuru, string> = {
  kategori: "kategoriler",
  marka: "markalar",
  etiket: "etiketler",
  urun: "urunler",
  "blog-yazisi": "blog_yazilari",
  sayfa: "sabit_sayfalar",
};
const dogrudanAdVer = (vt: Veritabani, tur: AdresliKayitTuru, kimlik: string, adresAdi: string) =>
  vt.execute(
    sql`update ${sql.identifier(tablolar[tur])} set adres_adi = ${adresAdi} where kimlik = ${kimlik}`,
  );

const hatasi = (soz: Promise<unknown>) =>
  soz.then(
    () => "hata yok",
    (hata: { kod?: unknown; ayrinti?: unknown }) => ({ kod: hata.kod, ayrinti: hata.ayrinti }),
  );
const eskiAdresHatasi = { kod: "cakisma", ayrinti: [{ alan: "adresAdi", kod: "adres-adi-eski" }] };

// Her türün ekleme, ad değiştirme ve silme yolu. Ürün vitrinde açılsın diye yayında eklenir. Adres adı
// verilmezse servis addan üretir.
type Islemler = {
  ekle: (vt: Veritabani, ad: string, adresAdi?: string) => Promise<string>;
  adiDegistir: (vt: Veritabani, kimlik: string, adresAdi: string) => Promise<void>;
  sil: (vt: Veritabani, kimlik: string) => Promise<unknown>;
};
const adres = (adresAdi: string | undefined) => (adresAdi === undefined ? {} : { adresAdi });
const turler: Record<AdresliKayitTuru, Islemler> = {
  kategori: {
    ekle: (vt, ad, adresAdi) => kategoriEkle(vt, yonetici(), { ad, ...adres(adresAdi) }),
    adiDegistir: (vt, kimlik, adresAdi) => kategoriDegistir(vt, yonetici(), kimlik, { adresAdi }),
    sil: (vt, kimlik) => kategoriSil(vt, yonetici(), kimlik),
  },
  marka: {
    ekle: (vt, ad, adresAdi) => markaServisi.ekle(vt, yonetici(), { ad, ...adres(adresAdi) }),
    adiDegistir: (vt, kimlik, adresAdi) =>
      markaServisi.degistir(vt, yonetici(), kimlik, { adresAdi }),
    sil: (vt, kimlik) => markaServisi.sil(vt, yonetici(), kimlik),
  },
  etiket: {
    ekle: (vt, ad, adresAdi) => etiketServisi.ekle(vt, yonetici(), { ad, ...adres(adresAdi) }),
    adiDegistir: (vt, kimlik, adresAdi) =>
      etiketServisi.degistir(vt, yonetici(), kimlik, { adresAdi }),
    sil: (vt, kimlik) => etiketServisi.sil(vt, yonetici(), kimlik),
  },
  urun: {
    ekle: (vt, ad, adresAdi) =>
      urunSrv.urunEkle(vt, yonetici(), {
        ad,
        ...adres(adresAdi),
        vergiSinifi: null,
        durum: "yayinda",
      }),
    adiDegistir: (vt, kimlik, adresAdi) =>
      urunSrv.urunDegistir(vt, yonetici(), kimlik, { adresAdi }),
    sil: (vt, kimlik) => urunSrv.urunSil(vt, yonetici(), kimlik),
  },
  // Kart 0272: blog yazısı; vitrinde açılsın diye yayında eklenir.
  "blog-yazisi": {
    ekle: async (vt, baslik, adresAdi) =>
      (await icerikSrv.yaziEkle(vt, yonetici(), { baslik, ...adres(adresAdi), durum: "yayinda" }))
        .kimlik,
    adiDegistir: async (vt, kimlik, adresAdi) => {
      await icerikSrv.yaziDegistir(vt, yonetici(), kimlik, { adresAdi });
    },
    sil: (vt, kimlik) => icerikSrv.yaziSil(vt, yonetici(), kimlik),
  },
  // Kart 0273: sabit sayfa; vitrinde açılsın diye yayında eklenir.
  sayfa: {
    ekle: async (vt, baslik, adresAdi) =>
      (
        await sabitSayfaServisi.sayfaEkle(vt, yonetici(), {
          baslik,
          ...adres(adresAdi),
          durum: "yayinda",
        })
      ).kimlik,
    adiDegistir: async (vt, kimlik, adresAdi) => {
      await sabitSayfaServisi.sayfaDegistir(vt, yonetici(), kimlik, { adresAdi });
    },
    sil: (vt, kimlik) => sabitSayfaServisi.sayfaSil(vt, yonetici(), kimlik),
  },
};

describe.each(adresliKayitTurleri)("%s", (tur) => {
  const { ekle, adiDegistir, sil } = turler[tur];

  it("adı bu olan kayıt bulunur; bir ve iki kez değişen eski ad bugünkü ada tek adımda yönlenir", async () => {
    const vt = await siteAc();
    const kimlik = await ekle(vt, "Kışlık", "kislik");
    expect(await kayitAdresiniCoz(vt, tur, "kislik")).toMatchObject({
      sonuc: "kayit",
      kayit: { kimlik, ad: "Kışlık", adresAdi: "kislik" },
    });
    await adiDegistir(vt, kimlik, "kis");
    expect(await kayitAdresiniCoz(vt, tur, "kislik")).toEqual({
      sonuc: "yonlendir",
      adresAdi: "kis",
    });
    await adiDegistir(vt, kimlik, "kis-koleksiyonu");
    // İki eski ad da bugünkü ada gider, eski addan eski ada zincir kurulmaz.
    for (const eski of ["kislik", "kis"]) {
      expect(await kayitAdresiniCoz(vt, tur, eski)).toEqual({
        sonuc: "yonlendir",
        adresAdi: "kis-koleksiyonu",
      });
    }
    expect(await kayitAdresiniCoz(vt, tur, "kis-koleksiyonu")).toMatchObject({ sonuc: "kayit" });
    expect(await kayitAdresiniCoz(vt, tur, "hic-olmamis")).toEqual({ sonuc: "yok" });
  });

  it("eski ad yaşayan başka bir kayda verilince o kayıt kazanır", async () => {
    const vt = await siteAc();
    const ilk = await ekle(vt, "Yazlık", "yazlik");
    await adiDegistir(vt, ilk, "yaz");
    // Servis eski adı başka kayda vermez (kart 0330); kural servisi atlayan yazıyla denenir.
    const ikinci = await ekle(vt, "Yazlık Yeni", "yazlik-gecici");
    await dogrudanAdVer(vt, tur, ikinci, "yazlik");
    expect(await kayitAdresiniCoz(vt, tur, "yazlik")).toMatchObject({
      sonuc: "kayit",
      kayit: { kimlik: ikinci },
    });
    // İkinci kayıt da adı bırakınca eski ad en son bırakana yönlenir.
    await adiDegistir(vt, ikinci, "yazlik-yeni");
    expect(await kayitAdresiniCoz(vt, tur, "yazlik")).toEqual({
      sonuc: "yonlendir",
      adresAdi: "yazlik-yeni",
    });
    expect(await kayitAdresiniCoz(vt, tur, "yaz")).toMatchObject({
      sonuc: "kayit",
      kayit: { kimlik: ilk },
    });
  });

  it("ad eski hâline dönünce kayıt kendi adıyla açılır, ara ad ona yönlenir", async () => {
    const vt = await siteAc();
    const kimlik = await ekle(vt, "Bahar", "bahar");
    await adiDegistir(vt, kimlik, "ilkbahar");
    await adiDegistir(vt, kimlik, "bahar");
    expect(await kayitAdresiniCoz(vt, tur, "bahar")).toMatchObject({ sonuc: "kayit" });
    expect(await kayitAdresiniCoz(vt, tur, "ilkbahar")).toEqual({
      sonuc: "yonlendir",
      adresAdi: "bahar",
    });
  });

  it("adı yeni sahibi silinince eski sahibine yönlenmez, bulunamaz", async () => {
    const vt = await siteAc();
    const eski = await ekle(vt, "Kış", "kis");
    await adiDegistir(vt, eski, "kis-yeni");
    const yeni = await ekle(vt, "Kış Başka", "kis-gecici");
    await dogrudanAdVer(vt, tur, yeni, "kis");
    expect(await kayitAdresiniCoz(vt, tur, "kis")).toMatchObject({
      sonuc: "kayit",
      kayit: { kimlik: yeni },
    });
    await sil(vt, yeni);
    expect(await kayitAdresiniCoz(vt, tur, "kis")).toEqual({ sonuc: "yok" });
    expect(await kayitAdresiniCoz(vt, tur, "kis-yeni")).toMatchObject({
      sonuc: "kayit",
      kayit: { kimlik: eski },
    });
  });

  it("silinen kaydın adını sonradan alıp bırakan kayıt kazanır", async () => {
    const vt = await siteAc();
    const silinen = await ekle(vt, "Yaz", "yaz");
    await sil(vt, silinen);
    const yeni = await ekle(vt, "Yaz Yeni", "yaz");
    await adiDegistir(vt, yeni, "yaz-yeni");
    expect(await kayitAdresiniCoz(vt, tur, "yaz")).toEqual({
      sonuc: "yonlendir",
      adresAdi: "yaz-yeni",
    });
  });

  it("yaşayan kaydın eski adresi elle verilince reddedilir, hiçbir şey yazılmaz, eski bağlantı yönlenir", async () => {
    const vt = await siteAc();
    const ilk = await ekle(vt, "Çiçekli", "cicekli");
    await adiDegistir(vt, ilk, "desenli");
    const oncekiSatirlar = await vt.select().from(eskiAdresler);
    expect(await hatasi(ekle(vt, "Çiçekli Yeni", "cicekli"))).toEqual(eskiAdresHatasi);
    const baska = await ekle(vt, "Başka", "baska");
    expect(await hatasi(adiDegistir(vt, baska, "cicekli"))).toEqual(eskiAdresHatasi);
    expect(await kayitAdresiniCoz(vt, tur, "cicekli")).toEqual({
      sonuc: "yonlendir",
      adresAdi: "desenli",
    });
    expect(await kayitAdresiniCoz(vt, tur, "baska")).toMatchObject({
      sonuc: "kayit",
      kayit: { kimlik: baska },
    });
    expect(await vt.select().from(eskiAdresler)).toEqual(oncekiSatirlar);
    // Canlı kaydın adresi yine "tekrar"dır, eski adres değil.
    expect(await hatasi(ekle(vt, "Desenli Yeni", "desenli"))).toMatchObject({
      ayrinti: [{ alan: "adresAdi", kod: "adres-adi-tekrar" }],
    });
  });

  it("addan üretilen adres yaşayan kaydın eski adresini almaz, sayı alır; eski bağlantı yönlenir", async () => {
    const vt = await siteAc();
    const ilk = await ekle(vt, "Çiçekli Şal", "cicekli-sal");
    await adiDegistir(vt, ilk, "desenli-sal");
    // Ad kategori, marka ve etikette de tekildir: aynı adresi üreten başka bir yazılış.
    const yeni = await ekle(vt, "Çiçekli-Şal");
    expect(await kayitAdresiniCoz(vt, tur, "cicekli-sal-2")).toMatchObject({
      sonuc: "kayit",
      kayit: { kimlik: yeni },
    });
    expect(await kayitAdresiniCoz(vt, tur, "cicekli-sal")).toEqual({
      sonuc: "yonlendir",
      adresAdi: "desenli-sal",
    });
  });

  it("silinmiş kaydın eski adresi ve kaydın kendi eski adresi serbesttir", async () => {
    const vt = await siteAc();
    const silinen = await ekle(vt, "Kumaş", "kumas");
    await adiDegistir(vt, silinen, "kumas-eski");
    await sil(vt, silinen);
    const uretilen = await ekle(vt, "Kumaş");
    expect(await kayitAdresiniCoz(vt, tur, "kumas")).toMatchObject({
      sonuc: "kayit",
      kayit: { kimlik: uretilen },
    });
    const elle = await ekle(vt, "Kumaş Eski", "kumas-eski");
    expect(await kayitAdresiniCoz(vt, tur, "kumas-eski")).toMatchObject({
      sonuc: "kayit",
      kayit: { kimlik: elle },
    });
    // Kayıt kendi eski adresine döner (öteki kaydın değil).
    await adiDegistir(vt, elle, "kumas-yeni");
    await adiDegistir(vt, elle, "kumas-eski");
    expect(await kayitAdresiniCoz(vt, tur, "kumas-eski")).toMatchObject({
      sonuc: "kayit",
      kayit: { kimlik: elle },
    });
  });

  it("silinen kaydın ne kendi adresi ne eski adresi açılır", async () => {
    const vt = await siteAc();
    const kimlik = await ekle(vt, "Güz", "guz");
    await adiDegistir(vt, kimlik, "sonbahar");
    await sil(vt, kimlik);
    expect(await kayitAdresiniCoz(vt, tur, "sonbahar")).toEqual({ sonuc: "yok" });
    expect(await kayitAdresiniCoz(vt, tur, "guz")).toEqual({ sonuc: "yok" });
  });
});

describe("adresin çözülmesi", () => {
  it("kalıba uymayan ad sorgu atmadan bulunamaz", async () => {
    const vt = await siteAc();
    await turler.kategori.ekle(vt, "Giyim", "giyim");
    const sorgu = vt.$client.query.bind(vt.$client);
    let sayi = 0;
    vt.$client.query = ((...argumanlar: Parameters<typeof sorgu>) => {
      sayi += 1;
      return sorgu(...argumanlar);
    }) as typeof sorgu;
    for (const ad of [
      "Giyim",
      "giyim/",
      "giy im",
      "giyim--",
      "-giyim",
      "çanta",
      "a".repeat(101),
      "",
    ]) {
      expect(await kayitAdresiniCoz(vt, "kategori", ad)).toEqual({ sonuc: "yok" });
    }
    expect(sayi).toBe(0);
  });

  it("sayfası açılmayan ürün ne kendi adıyla ne eski adıyla açılır, açılınca ikisi de açılır", async () => {
    const vt = await siteAc();
    const kimlik = await urunSrv.urunEkle(vt, yonetici(), {
      ad: "Taslak Kazak",
      adresAdi: "taslak-kazak",
      vergiSinifi: null,
      durum: "taslak",
    });
    await urunSrv.urunDegistir(vt, yonetici(), kimlik, { adresAdi: "kazak" });
    expect(await kayitAdresiniCoz(vt, "urun", "kazak")).toEqual({ sonuc: "yok" });
    expect(await kayitAdresiniCoz(vt, "urun", "taslak-kazak")).toEqual({ sonuc: "yok" });
    await urunSrv.urunDegistir(vt, yonetici(), kimlik, { durum: "yayinda" });
    expect(await kayitAdresiniCoz(vt, "urun", "kazak")).toMatchObject({ sonuc: "kayit" });
    expect(await kayitAdresiniCoz(vt, "urun", "taslak-kazak")).toEqual({
      sonuc: "yonlendir",
      adresAdi: "kazak",
    });
    // Zamanı gelmemiş ürün o andan önce açılmaz.
    await urunSrv.urunDegistir(vt, yonetici(), kimlik, {
      durum: "zamanlanmis",
      yayinZamani: "2099-01-01T00:00",
    });
    expect(await kayitAdresiniCoz(vt, "urun", "taslak-kazak")).toEqual({ sonuc: "yok" });
  });

  it("aynı ad iki türün eski adı olunca her tür kendi kaydına yönlenir", async () => {
    const vt = await siteAc();
    const kategori = await turler.kategori.ekle(vt, "Ses", "ses");
    const marka = await turler.marka.ekle(vt, "Ses", "ses");
    await turler.kategori.adiDegistir(vt, kategori, "ses-sistemleri");
    await turler.marka.adiDegistir(vt, marka, "ses-markasi");
    expect(await kayitAdresiniCoz(vt, "kategori", "ses")).toEqual({
      sonuc: "yonlendir",
      adresAdi: "ses-sistemleri",
    });
    expect(await kayitAdresiniCoz(vt, "marka", "ses")).toEqual({
      sonuc: "yonlendir",
      adresAdi: "ses-markasi",
    });
    expect(await kayitAdresiniCoz(vt, "etiket", "ses")).toEqual({ sonuc: "yok" });
  });

  it("adı şu an sayfası açılmayan bir ürün taşıyorsa eski sahibine yönlenmez", async () => {
    const vt = await siteAc();
    const eski = await turler.urun.ekle(vt, "Eski Kazak", "kazak");
    await turler.urun.adiDegistir(vt, eski, "eski-kazak");
    const taslak = await urunSrv.urunEkle(vt, yonetici(), {
      ad: "Yeni Kazak",
      adresAdi: "yeni-kazak",
      vergiSinifi: null,
      durum: "taslak",
    });
    await dogrudanAdVer(vt, "urun", taslak, "kazak");
    expect(await kayitAdresiniCoz(vt, "urun", "kazak")).toEqual({ sonuc: "yok" });
    await urunSrv.urunDegistir(vt, yonetici(), taslak, { durum: "yayinda" });
    expect(await kayitAdresiniCoz(vt, "urun", "kazak")).toMatchObject({
      sonuc: "kayit",
      kayit: { kimlik: taslak },
    });
  });

  it("sayfası açılmayan ürünün eski adresi de kullanılmıştır: elle reddedilir, üretimde sayı alır", async () => {
    const vt = await siteAc();
    const sahip = await turler.urun.ekle(vt, "Örgü Atkı", "orgu-atki");
    await turler.urun.adiDegistir(vt, sahip, "atki");
    await urunSrv.urunDegistir(vt, yonetici(), sahip, { durum: "taslak" });
    expect(await hatasi(turler.urun.ekle(vt, "Başka Atkı", "orgu-atki"))).toEqual(eskiAdresHatasi);
    const yeni = await turler.urun.ekle(vt, "Örgü Atkı");
    expect(await kayitAdresiniCoz(vt, "urun", "orgu-atki-2")).toMatchObject({
      sonuc: "kayit",
      kayit: { kimlik: yeni },
    });
    // Sahip yeniden açılınca eski bağlantı ona yönlenir.
    await urunSrv.urunDegistir(vt, yonetici(), sahip, { durum: "yayinda" });
    expect(await kayitAdresiniCoz(vt, "urun", "orgu-atki")).toEqual({
      sonuc: "yonlendir",
      adresAdi: "atki",
    });
  });

  it("kopya silinmiş ürünün eski adresini alır, silinmemiş ürününkini almaz", async () => {
    const vt = await siteAc();
    const silinen = await turler.urun.ekle(vt, "Keten Gömlek", "keten-gomlek");
    await turler.urun.adiDegistir(vt, silinen, "keten-gomlek-eski");
    await turler.urun.sil(vt, silinen);
    const yasayan = await turler.urun.ekle(vt, "Pamuk Gömlek", "pamuk-gomlek");
    await turler.urun.adiDegistir(vt, yasayan, "pamuk-gomlek-eski");
    const kaynak = await turler.urun.ekle(vt, "Kaynak", "kaynak");
    const kopyaAdresi = (kok: string) =>
      vt.transaction((islem) => urunSrv.bosAdresAdiBul(islem, kok, kaynak));
    expect(await kopyaAdresi("keten-gomlek-eski")).toBe("keten-gomlek-eski");
    expect(await kopyaAdresi("pamuk-gomlek")).toBe("pamuk-gomlek-2");
  });

  it("servisi atlayan yazıda da eski ad saklanır; aynı ad yazılınca satır eklenmez", async () => {
    const vt = await siteAc();
    const kimlik = await turler.kategori.ekle(vt, "Ev", "ev");
    await vt.execute(sql`update kategoriler set adres_adi = 'ev-yasam' where kimlik = ${kimlik}`);
    await vt.execute(
      sql`update kategoriler set adres_adi = 'ev-yasam', ad = 'Ev' where kimlik = ${kimlik}`,
    );
    const satirlar = await vt.select().from(eskiAdresler);
    expect(satirlar).toMatchObject([
      { kayit_turu: "kategori", kayit_kimligi: kimlik, adres_adi: "ev" },
    ]);
    expect(await kayitAdresiniCoz(vt, "kategori", "ev")).toEqual({
      sonuc: "yonlendir",
      adresAdi: "ev-yasam",
    });
  });

  it("veritabanının kabul ettiği türler kayıttakilerle aynıdır", async () => {
    const vt = await siteAc();
    const { rows } = await vt.execute<{ tanim: string }>(
      sql`select pg_get_constraintdef(oid) as tanim from pg_constraint where conname = 'eski_adresler_tur'`,
    );
    const tanim = rows[0]?.tanim ?? "";
    expect([...tanim.matchAll(/'([a-z-]+)'/g)].map((eslesme) => eslesme[1])).toEqual([
      ...adresliKayitTurleri,
    ]);
    await expect(
      vt
        .insert(eskiAdresler)
        .values({ kayit_turu: "kampanya", kayit_kimligi: randomUUID(), adres_adi: "x" }),
    ).rejects.toThrow();
  });

  it("iki site birbirinin eski adresini görmez", async () => {
    const birinci = await siteAc();
    const ikinci = await siteAc();
    const kimlik = await turler.marka.ekle(birinci, "Deneme Ses", "deneme-ses");
    await turler.marka.adiDegistir(birinci, kimlik, "deneme-ses-yeni");
    await turler.marka.ekle(ikinci, "Deneme Ses Yeni", "deneme-ses-yeni");
    expect(await kayitAdresiniCoz(ikinci, "marka", "deneme-ses")).toEqual({ sonuc: "yok" });
    expect(
      await ikinci.select().from(eskiAdresler).where(eq(eskiAdresler.adres_adi, "deneme-ses")),
    ).toEqual([]);
  });
});
