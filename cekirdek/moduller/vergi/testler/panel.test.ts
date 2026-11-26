// Vergi ekranının servis işleri gerçek veritabanıyla (kart 0322): sınıfların sıralaması yalnız silinmemiş sınıfların tam
// kümesini kabul eder ve yalnız sırası değişeni yazıp kaydeder; sınıf başına ürün sayısı silinmiş ürünü saymaz; genel
// ayarlar fiyat ek metninin üç türünü ayara çevirir, hatalı alanda ve silinmiş kargo sınıfında hiçbir şey yazılmaz.

import { randomUUID } from "node:crypto";
import { join, resolve } from "node:path";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { siteninFiyatServisi } from "../../fiyat/servis.ts";
import { siteninServisi } from "../../magaza-ayarlari/servis.ts";
import { odemeBilgileriSemasi } from "../../odeme/semalar.ts";
import { odemeServisi } from "../../odeme/servis.ts";
import { siparisKalemleri, siparisler } from "../../siparis/model.ts";
import { stokServisi } from "../../stok/servis.ts";
import { urunServisi } from "../../urun/servis.ts";
import { vergiAyarlariniDegistir, vergiAyarlariniOku } from "../ayarlar.ts";
import { siteninVergiServisi } from "../servis.ts";
import type { VergiAyarlariGirdisi } from "../uc-semalari.ts";

const site = siteKlasorunuOku(
  join(resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler"), "gecerli"),
);
const vergi = siteninVergiServisi(site);
const urun = urunServisi(() => "Europe/Istanbul");
const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const silinecekler: (() => Promise<void>)[] = [];
const siteAc = async (): Promise<Veritabani> => {
  const deneme = await denemeSitesiAc("vergi-paneli");
  silinecekler.push(deneme.sil);
  return deneme.vt;
};
afterEach(async () => {
  await Promise.all(silinecekler.splice(0).map((sil) => sil()));
});

const hatasi = async (is: Promise<unknown>) => {
  const hata = await is.then(
    () => undefined,
    (yakalanan: unknown) => yakalanan,
  );
  if (!(hata instanceof BilinenHata)) throw new Error(`Bilinen hata beklendi: ${String(hata)}`);
  return { kod: hata.kod, ayrinti: hata.ayrinti };
};

const etkinSira = async (vt: Veritabani) =>
  (await vergi.tabloyuOku(vt)).map((sinif) => sinif.kimlik);

describe("sınıfların sıralaması", () => {
  it("yeni sırayı yazar, yalnız sırası değişeni kaydeder, aynı sıra hiçbir şey yazmaz", async () => {
    const vt = await siteAc();
    const baslangic = await etkinSira(vt);
    const a = await vergi.sinifEkle(vt, yonetici(), { ad: "Sıra A" });
    const b = await vergi.sinifEkle(vt, yonetici(), { ad: "Sıra B" });
    const sira = await etkinSira(vt);
    expect(sira.slice(-2)).toEqual([a, b]);
    const yeni = [...baslangic, b, a];
    const kim = yonetici();
    await vergi.siniflariSirala(
      vt,
      kim,
      yeni.map((k) => k.toUpperCase()),
    );
    expect(await etkinSira(vt)).toEqual(yeni);
    const kayit = await vt
      .select({ kimlik: degisiklikKayitlari.kayit_kimligi })
      .from(degisiklikKayitlari)
      .where(eq(degisiklikKayitlari.kim_kimligi, kim.kimlik));
    expect(kayit.map((k) => k.kimlik).sort()).toEqual([a, b].sort());

    const ikinci = yonetici();
    await vergi.siniflariSirala(vt, ikinci, yeni);
    expect(
      await vt
        .select()
        .from(degisiklikKayitlari)
        .where(eq(degisiklikKayitlari.kim_kimligi, ikinci.kimlik)),
    ).toEqual([]);
  });

  it("eksik, fazla, tekrarlı, silinmiş ve olmayan kimlikli liste siralama-gecersiz alır, hiçbir şey değişmez", async () => {
    const vt = await siteAc();
    await vergi.sinifEkle(vt, yonetici(), { ad: "Küme A" });
    await vergi.sinifEkle(vt, yonetici(), { ad: "Küme B" });
    const silinen = await vergi.sinifEkle(vt, yonetici(), { ad: "Küme Silinen" });
    await vergi.sinifSil(vt, yonetici(), silinen);
    const sira = await etkinSira(vt);
    const ters = [...sira].reverse();
    for (const liste of [
      sira.slice(1),
      [...ters, randomUUID()],
      [...ters.slice(1), ters[1] ?? ""],
      [...ters, silinen],
      [...ters.slice(1), randomUUID()],
    ]) {
      expect(await hatasi(vergi.siniflariSirala(vt, yonetici(), liste))).toEqual({
        kod: "cakisma",
        ayrinti: { kod: "siralama-gecersiz" },
      });
    }
    expect(await etkinSira(vt)).toEqual(sira);
  });
});

describe("sınıf başına ürün sayısı", () => {
  it("yalnız silinmemiş ürünleri sayar, ürünsüz sınıf sayılmaz", async () => {
    const vt = await siteAc();
    const a = await vergi.sinifEkle(vt, yonetici(), { ad: "Sayı A" });
    const b = await vergi.sinifEkle(vt, yonetici(), { ad: "Sayı B" });
    await urun.urunEkle(vt, yonetici(), { ad: "Sayı 1", vergiSinifi: a });
    await urun.urunEkle(vt, yonetici(), { ad: "Sayı 2", vergiSinifi: a });
    const silinen = await urun.urunEkle(vt, yonetici(), { ad: "Sayı 3", vergiSinifi: a });
    await urun.urunEkle(vt, yonetici(), { ad: "Sayı 4", vergiSinifi: null });
    await urun.urunSil(vt, yonetici(), silinen);
    const sayilar = await vergi.sinifUrunSayilari(vt);
    expect(sayilar.get(a)).toBe(2);
    expect(sayilar.has(b)).toBe(false);
  });
});

const girdi = (ek: Partial<VergiAyarlariGirdisi> = {}): VergiAyarlariGirdisi => ({
  vergiAcik: true,
  vergiAdi: "Panel Vergisi",
  fiyatGosterimi: "vergi-haric",
  fiyatEkMetniTuru: "otomatik",
  fiyatEkMetni: "",
  vergiAdresi: "teslimat",
  vergiYuvarlama: "satir",
  kargoSinifi: null,
  ...ek,
});

describe("genel ayarlar", () => {
  it("ek metnin üç türü ayara çevrilir ve okunur, fiyat girişi değişmez, kargo sınıfı yazılır", async () => {
    const vt = await siteAc();
    const sinif = await vergi.sinifEkle(vt, yonetici(), { ad: "Kargo" });
    const ayar = siteninServisi(site);
    const once = (await ayar.oku(vt)).fiyatGirisi;

    let okunan = await vergiAyarlariniDegistir(
      vt,
      site,
      yonetici(),
      girdi({ fiyatEkMetniTuru: "kendi", fiyatEkMetni: " Vergi ayrıca ", kargoSinifi: sinif }),
    );
    expect(okunan).toMatchObject({
      vergiAdi: "Panel Vergisi",
      fiyatGosterimi: "vergi-haric",
      fiyatEkMetniTuru: "kendi",
      fiyatEkMetni: "Vergi ayrıca",
      kargoSinifi: sinif,
      fiyatGirisi: once,
    });
    okunan = await vergiAyarlariniDegistir(
      vt,
      site,
      yonetici(),
      girdi({ fiyatEkMetniTuru: "yok", kargoSinifi: sinif }),
    );
    expect((await ayar.oku(vt)).fiyatEkMetni).toBe("");
    expect(okunan.fiyatEkMetniTuru).toBe("yok");
    okunan = await vergiAyarlariniDegistir(vt, site, yonetici(), girdi());
    expect((await ayar.oku(vt)).fiyatEkMetni).toBeUndefined();
    expect(okunan).toMatchObject({ fiyatEkMetniTuru: "otomatik", kargoSinifi: null });
    expect(await vergiAyarlariniOku(vt, site)).toEqual(okunan);
  });

  it("boş vergi adı ayarı kaldırır (ad isteğe bağlıdır), anahtar biçimindeki ad alanın koduyla döner", async () => {
    const vt = await siteAc();
    const okunan = await vergiAyarlariniDegistir(vt, site, yonetici(), girdi({ vergiAdi: " " }));
    expect((await siteninServisi(site).oku(vt)).vergiAdi).toBeUndefined();
    expect(okunan.vergiAdi).toBe("");
    expect(
      await hatasi(
        vergiAyarlariniDegistir(
          vt,
          site,
          yonetici(),
          girdi({ vergiAdi: "Bearer abcdefghijklmnopqrstuvwx" }),
        ),
      ),
    ).toEqual({ kod: "dogrulama", ayrinti: [{ alan: "vergiAdi", kod: "ad-bicimi" }] });
  });

  it("boş ya da kayda uygun olmayan kendi metni ve silinmiş kargo sınıfı alanın koduyla döner, hiçbir şey yazılmaz", async () => {
    const vt = await siteAc();
    const silinen = await vergi.sinifEkle(vt, yonetici(), { ad: "Silinen" });
    await vergi.sinifSil(vt, yonetici(), silinen);
    const once = await vergiAyarlariniOku(vt, site);
    expect(
      await hatasi(
        vergiAyarlariniDegistir(
          vt,
          site,
          yonetici(),
          girdi({ fiyatEkMetniTuru: "kendi", fiyatEkMetni: " " }),
        ),
      ),
    ).toEqual({ kod: "dogrulama", ayrinti: [{ alan: "fiyatEkMetni", kod: "too_small" }] });
    expect(
      await hatasi(
        vergiAyarlariniDegistir(
          vt,
          site,
          yonetici(),
          girdi({ fiyatEkMetniTuru: "kendi", fiyatEkMetni: "satis@ornek.test" }),
        ),
      ),
    ).toEqual({ kod: "dogrulama", ayrinti: [{ alan: "fiyatEkMetni", kod: "gecersiz" }] });
    expect(
      await hatasi(vergiAyarlariniDegistir(vt, site, yonetici(), girdi({ kargoSinifi: silinen }))),
    ).toEqual({ kod: "dogrulama", ayrinti: [{ alan: "kargoSinifi", kod: "sinif-silinmis" }] });
    expect(
      await hatasi(
        vergiAyarlariniDegistir(vt, site, yonetici(), girdi({ kargoSinifi: randomUUID() })),
      ),
    ).toEqual({ kod: "dogrulama", ayrinti: [{ alan: "kargoSinifi", kod: "sinif-silinmis" }] });
    expect(await vergiAyarlariniOku(vt, site)).toEqual(once);
  });
});

// Verilmiş sipariş vergi değişikliğinden etkilenmez (kart 0322): oranı, vergi adını, gösterimi, yuvarlamayı ve kargonun
// sınıfını değiştirmek siparişin ve kalemlerinin hiçbir alanını değiştirmez.
const vergiDolu = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/vergi-dolu"),
);
const siparisSitesi: Site = {
  ...vergiDolu,
  baslangic: {
    ...vergiDolu.baslangic,
    magazaAdresi: {
      ulke: "TR",
      il: "TR-06",
      ilce: "TR-06-007",
      adres: "Deneme Sokak No: 1",
      postaKodu: "06000",
    },
    odemeYontemleri: [{ kod: "kapida-odeme", acik: true }],
    kapidaOdemeSecenekleri: ["nakit"],
  },
};

describe("verilmiş sipariş", () => {
  it("vergi değişiklikleri siparişi ve kalemlerini değiştirmez", async () => {
    const vt = await siteAc();
    const sv = siteninVergiServisi(siparisSitesi);
    const urunSrv = urunServisi(() => siparisSitesi.ayarlar.saatDilimi);
    const [sinif] = await sv.tabloyuOku(vt);
    if (sinif === undefined || sinif.oranlar[0] === undefined) throw new Error("Oranlı sınıf yok.");
    const urunKimligi = await urunSrv.urunEkle(vt, yonetici(), {
      ad: "Vergili ürün",
      vergiSinifi: sinif.kimlik,
      durum: "yayinda",
      stokTakibi: true,
    });
    const birim = (await urunSrv.urunuOku(vt, urunKimligi))?.birimler[0]?.kimlik ?? "";
    await siteninFiyatServisi(siparisSitesi).fiyatYaz(vt, yonetici(), birim, {
      satisFiyati: 12_345,
    });
    await stokServisi().stokDuzelt(vt, yonetici(), birim, {
      yeniMiktar: 5,
      gorulenMiktar: 0,
      sebep: "sayim",
    });
    const { siparis } = await odemeServisi(siparisSitesi).siparisVer(
      vt,
      {
        kim: { tur: "misafir", eposta: "misafir@ornek.test", hesap: { ac: false } },
        bilgiler: odemeBilgileriSemasi.parse({
          odemeYontemi: { yontem: "kapida-odeme", secenek: "nakit" },
          teslimat: {
            ad: "Deniz",
            soyad: "Yılmaz",
            telefon: "0555 000 00 00",
            adres: {
              ulke: "TR",
              il: "TR-06",
              ilce: "TR-06-007",
              adres: "Atatürk Bulvarı No: 10",
              postaKodu: "06420",
            },
          },
          fatura: { tur: "bireysel", adresAyni: true },
          onBilgilendirmeOnayi: true,
          mesafeliSatisOnayi: true,
          pazarlamaIzni: false,
        }),
        kalemler: [{ birim, adet: 2 }],
      },
      3600,
    );
    const oku = async () => {
      const [satir] = await vt
        .select()
        .from(siparisler)
        .where(eq(siparisler.numara, siparis.numara));
      const kalemler = await vt
        .select()
        .from(siparisKalemleri)
        .where(eq(siparisKalemleri.siparis_kimligi, satir?.kimlik ?? ""));
      return { satir, kalemler };
    };
    const once = await oku();
    expect(once.kalemler).toHaveLength(1);

    await sv.oranDegistir(vt, yonetici(), sinif.oranlar[0].kimlik, { oran: "33" });
    await vergiAyarlariniDegistir(vt, siparisSitesi, yonetici(), {
      vergiAcik: false,
      vergiAdi: "Başka Vergi",
      fiyatGosterimi: "vergi-haric",
      fiyatEkMetniTuru: "yok",
      fiyatEkMetni: "",
      vergiAdresi: "magaza",
      vergiYuvarlama: "ara-toplam",
      kargoSinifi: sinif.kimlik,
    });
    expect(await oku()).toEqual(once);
  });
});
