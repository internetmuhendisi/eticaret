// Ürün yorumları gerçek veritabanıyla (kart 0139, karar 0109):
// - Onay bekleyen ve reddedilen yorum hiçbir yerde görünmez, ortalamaya girmez: ürünün yorumları, puan özeti ve
//   ana sayfanın yorumları yalnız yayındakileri verir.
// - "Yalnız satın alanlar yorum yapabilir" açıkken (varsayılan) kimse yazamaz, kapalıyken girişli müşteri yazar.
//   Doğrulanmış alıcı işareti satın alma denetiminden gelir (bugün hep yok).
// - Bir müşteri bir ürüne bir yorum yazar, aynı anda gelen iki yazmada da. Sayfası açılmayan ürüne yazılmaz.
// - Görünen ad kısaltılmış kaydedilir; metin olduğu gibi (düz metin) saklanır.
// - Değişiklik kaydına puan, durum ve işaret girer; metin ve ad girmez. Aynı değer yazılmaz.
// - Ana sayfanın yorumları: işaretlenenler ya da en yeniler, yalnız listede görünen ürünlerin.
// - Veritabanının durum ve puan denetimi kayıtla aynı.
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { yorumDurumlari, yorumSinirlari } from "../../../kayitlar/yorum.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { kilitBekleyeniGor } from "../../../veritabani/testler/kilit-bekleyen.ts";
import { vitrinBaglaminiOku } from "../../../vitrin/baglam-oku.ts";
import type { BolumOrnegi } from "../../../vitrin/bolum-kutuphanesi/duzen.ts";
import { bolumKutuphanesi } from "../../../vitrin/bolum-kutuphanesi/kutuphane.ts";
import { urunKartlari } from "../../../vitrin/urun-karti/veri.ts";
import { urunSayfasiVerisi } from "../../../vitrin/urun-sayfasi/veri.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { siteninServisi } from "../../magaza-ayarlari/servis.ts";
import { hesapAc } from "../../oturum/servis.ts";
import { urunServisi } from "../../urun/servis.ts";
import { yorumlar } from "../model.ts";
import { yorumFormuSemasi } from "../semalar.ts";
import { anaSayfaYorumlari, puanOzetleri, urunYorumlari, yorumServisi } from "../servis.ts";

vi.setConfig({ testTimeout: 60_000 });

const site = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/gecerli"),
);
const servis = yorumServisi(site);
const urunSrv = urunServisi(() => site.ayarlar.saatDilimi);
const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

let vt: Veritabani;
let sil: () => Promise<void>;
beforeAll(async () => {
  ({ vt, sil } = await denemeSitesiAc("yorum"));
});
afterAll(async () => {
  await sil();
});

const urunAc = (durum: "yayinda" | "taslak" | "gizli" | "arsiv" = "yayinda") =>
  urunSrv.urunEkle(vt, yonetici(), {
    ad: `Ürün ${randomUUID().slice(0, 8)}`,
    vergiSinifi: null,
    durum,
  });
const musteriAc = async () =>
  (
    await hesapAc(vt, "musteri", {
      eposta: `m-${randomUUID().slice(0, 8)}@ornek.test`,
      sifre: "uzun-bir-deneme-sifresi",
    })
  ).hesapKimligi;
const satinAlmaKapali = () =>
  siteninServisi(site).degistir(vt, yonetici(), { yorumYalnizSatinAlanlar: false });
const yaz = (
  musteri: string,
  urun: string,
  puan: number,
  ek: { ad?: string; metin?: string } = {},
) =>
  servis.yorumYaz(vt, musteri, {
    urun,
    puan,
    metin: ek.metin ?? `Deneme yorumu ${puan}`,
    ad: ek.ad ?? "Deneme Müşteri",
  });
const hatasi = (vaat: Promise<unknown>) =>
  vaat.then(
    () => undefined,
    (hata: { kod?: string; ayrinti?: unknown }) => ({ kod: hata.kod, ayrinti: hata.ayrinti }),
  );

describe("yazma izni", () => {
  it("yalnız satın alanlar açıkken (varsayılan) kimse yazamaz; kapalıyken girişli müşteri yazar", async () => {
    const urun = await urunAc();
    const musteri = await musteriAc();
    expect(await servis.yorumIzni(vt, musteri, urun)).toBe("satin-alma-gerekli");
    expect(await hatasi(yaz(musteri, urun, 5))).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "urun", kod: "satin-alma-gerekli" }],
    });
    expect(await vt.select().from(yorumlar).where(eq(yorumlar.urun_kimligi, urun))).toEqual([]);
    await satinAlmaKapali();
    expect(await servis.yorumIzni(vt, musteri, urun)).toBe("yazabilir");
    await yaz(musteri, urun, 5);
    expect(await servis.yorumIzni(vt, musteri, urun)).toBe("yorum-yazildi");
  });

  it("sayfası açılmayan, olmayan ve bozuk kimlikli ürüne yazılmaz", async () => {
    await satinAlmaKapali();
    const musteri = await musteriAc();
    for (const urun of [await urunAc("taslak"), await urunAc("arsiv"), randomUUID(), "bozuk"]) {
      expect(await hatasi(servis.yorumIzni(vt, musteri, urun))).toEqual({
        kod: "bulunamadi",
        ayrinti: [{ alan: "urun", kod: "urun-yok" }],
      });
    }
    // Gizli ürünün sayfası bağlantıyla açılır: yorum yazılır.
    expect(await servis.yorumIzni(vt, musteri, await urunAc("gizli"))).toBe("yazabilir");
  });

  it("bir müşteri bir ürüne bir yorum yazar, aynı anda gelen iki yazmada da", async () => {
    await satinAlmaKapali();
    const urun = await urunAc();
    const musteri = await musteriAc();
    await yaz(musteri, urun, 4);
    expect(await hatasi(yaz(musteri, urun, 3))).toEqual({
      kod: "cakisma",
      ayrinti: [{ alan: "urun", kod: "yorum-yazildi" }],
    });
    const ikinci = await musteriAc();
    const sonuclar = await Promise.allSettled([yaz(ikinci, urun, 5), yaz(ikinci, urun, 1)]);
    expect(sonuclar.filter((s) => s.status === "fulfilled")).toHaveLength(1);
    const reddedilen = sonuclar.find((s) => s.status === "rejected");
    expect((reddedilen as PromiseRejectedResult).reason.kod).toBe("cakisma");
    const satirlar = await vt
      .select()
      .from(yorumlar)
      .where(and(eq(yorumlar.urun_kimligi, urun), eq(yorumlar.musteri_kimligi, ikinci)));
    expect(satirlar).toHaveLength(1);
  });
  it("açık duran yazmanın arkasındaki ikinci yazma tekil indekste bekler ve çakışma alır", async () => {
    await satinAlmaKapali();
    const urun = await urunAc();
    const musteri = await musteriAc();
    // Birinci yazma kaydedilmeden durur: ikincinin ön denetimi onu göremez, ekleme indekste bekler.
    let ikinci: Promise<unknown> | undefined;
    await vt.transaction(async (islem) => {
      await islem.insert(yorumlar).values({
        urun_kimligi: urun,
        musteri_kimligi: musteri,
        puan: 5,
        metin: "ilk",
        ad: "A B.",
        durum: "onay-bekliyor",
      });
      ikinci = hatasi(yaz(musteri, urun, 1));
      await kilitBekleyeniGor(vt);
    });
    expect(await ikinci).toEqual({
      kod: "cakisma",
      ayrinti: [{ alan: "urun", kod: "yorum-yazildi" }],
    });
  });
});

describe("yazılan yorum", () => {
  it("onay bekler, ad kısaltılır, metin düz metin olarak aynen saklanır, alıcı işareti yok", async () => {
    await satinAlmaKapali();
    const urun = await urunAc();
    const musteri = await musteriAc();
    const metin = '<script>alert(1)</script> <a href="x">bağlantı</a>\nikinci satır';
    const kimlik = await yaz(musteri, urun, 4, { ad: "  ayşe  nur yılmaz ", metin });
    const [satir] = await vt.select().from(yorumlar).where(eq(yorumlar.kimlik, kimlik));
    expect(satir).toMatchObject({
      durum: "onay-bekliyor",
      ad: "ayşe nur Y.",
      metin,
      dogrulanmis_alici: false,
      ana_sayfada: false,
      baslik: null,
    });
  });

  it("değişiklik kaydına puan ve durum girer, metin ve ad girmez; aynı değer kayda girmez", async () => {
    await satinAlmaKapali();
    const urun = await urunAc();
    const musteri = await musteriAc();
    const kimlik = await yaz(musteri, urun, 2, { ad: "Gizli Kişi", metin: "özel metin" });
    const kim = yonetici();
    await servis.karar(vt, kim, kimlik, "yayinda");
    await servis.karar(vt, kim, kimlik, "yayinda");
    await servis.anaSayfaIsareti(vt, kim, kimlik, true);
    await servis.anaSayfaIsareti(vt, kim, kimlik, true);
    const kayitlar = await vt
      .select({
        islem: degisiklikKayitlari.islem,
        kimTuru: degisiklikKayitlari.kim_turu,
        eski: degisiklikKayitlari.eski_deger,
        yeni: degisiklikKayitlari.yeni_deger,
      })
      .from(degisiklikKayitlari)
      .where(eq(degisiklikKayitlari.kayit_kimligi, kimlik))
      .orderBy(degisiklikKayitlari.zaman);
    expect(kayitlar).toEqual([
      {
        islem: "yorum.yazildi",
        kimTuru: "musteri",
        eski: null,
        yeni: { urun, puan: 2, durum: "onay-bekliyor" },
      },
      {
        islem: "yorum.durum-degisti",
        kimTuru: "yonetici",
        eski: { durum: "onay-bekliyor" },
        yeni: { durum: "yayinda" },
      },
      {
        islem: "yorum.ana-sayfa",
        kimTuru: "yonetici",
        eski: { anaSayfada: false },
        yeni: { anaSayfada: true },
      },
    ]);
    expect(JSON.stringify(kayitlar)).not.toMatch(/özel metin|Gizli|Kişi/);
  });

  it("e-posta ya da bağlantı ad olarak kabul edilmez, harfsiz ad da", () => {
    const sonuc = (ad: string) =>
      yorumFormuSemasi.safeParse({ urun: randomUUID(), puan: 3, metin: "x", ad }).success;
    expect(sonuc("Ayşe Yılmaz")).toBe(true);
    for (const ad of [
      "ayse.yilmaz@ornek.test",
      "https://kotu.test",
      "www.kotu.test",
      "a/b",
      "123",
    ]) {
      expect(sonuc(ad), ad).toBe(false);
    }
  });

  it("olmayan ve bozuk kimlikli yorum bulunamaz", async () => {
    for (const kimlik of [randomUUID(), "bozuk"]) {
      expect(await hatasi(servis.karar(vt, yonetici(), kimlik, "yayinda"))).toEqual({
        kod: "bulunamadi",
        ayrinti: [{ alan: "yorum", kod: "yorum-yok" }],
      });
    }
  });
});

describe("görünürlük ve ortalama", () => {
  it("onay bekleyen ve reddedilen hiçbir yerde görünmez, ortalamaya girmez", async () => {
    await satinAlmaKapali();
    const urun = await urunAc();
    const [a, b, c, d] = [
      await musteriAc(),
      await musteriAc(),
      await musteriAc(),
      await musteriAc(),
    ];
    const yayinda5 = await yaz(a, urun, 5);
    const yayinda2 = await yaz(b, urun, 2);
    const reddedilen = await yaz(c, urun, 1);
    await yaz(d, urun, 1);
    const kim = yonetici();
    for (const k of [yayinda5, yayinda2, reddedilen]) await servis.karar(vt, kim, k, "yayinda");
    await servis.karar(vt, kim, reddedilen, "reddedildi");
    for (const k of [yayinda5, yayinda2, reddedilen])
      await servis.anaSayfaIsareti(vt, kim, k, true);

    expect((await puanOzetleri(vt, [urun])).get(urun)).toEqual({
      ortalama: 3.5,
      sayi: 2,
      dagilim: [1, 0, 0, 1, 0],
    });
    const liste = await urunYorumlari(vt, urun, { sayfa: 1 });
    expect(liste.toplam).toBe(2);
    expect(liste.yorumlar.map((y) => y.kimlik).toSorted()).toEqual([yayinda5, yayinda2].toSorted());
    const anaSayfa = await anaSayfaYorumlari(vt, {
      isaretlenenler: true,
      adet: 50,
      an: new Date(),
    });
    expect(anaSayfa.map((y) => y.kimlik)).toContain(yayinda5);
    expect(anaSayfa.map((y) => y.kimlik)).not.toContain(reddedilen);
    // Reddedilen yeniden yayınlanınca görünür.
    await servis.karar(vt, kim, reddedilen, "yayinda");
    expect((await puanOzetleri(vt, [urun])).get(urun)?.sayi).toBe(3);
  });

  it("yorumu olmayan ürün özette yok; özet ürün sayısıyla tek sorgu", async () => {
    const bos = await urunAc();
    expect((await puanOzetleri(vt, [bos, "bozuk"])).has(bos)).toBe(false);
  });

  it("ürünün yorumları en yeni önce, sayfa sayfa ve birikimli; sınır dışı sayfa son sayfaya çekilir", async () => {
    await satinAlmaKapali();
    const urun = await urunAc();
    const kim = yonetici();
    const sira: string[] = [];
    for (let i = 0; i < yorumSinirlari.sayfa + 2; i++) {
      const k = await yaz(await musteriAc(), urun, 3);
      await servis.karar(vt, kim, k, "yayinda");
      sira.unshift(k);
    }
    const ilk = await urunYorumlari(vt, urun, { sayfa: 1 });
    expect(ilk.yorumlar.map((y) => y.kimlik)).toEqual(sira.slice(0, yorumSinirlari.sayfa));
    expect(ilk).toMatchObject({ toplam: sira.length, sayfa: 1, sayfaSayisi: 2 });
    const ikinci = await urunYorumlari(vt, urun, { sayfa: 2 });
    expect(ikinci.yorumlar.map((y) => y.kimlik)).toEqual(sira);
    expect((await urunYorumlari(vt, urun, { sayfa: 99 })).sayfa).toBe(2);
    expect((await urunYorumlari(vt, urun, { sayfa: -3 })).sayfa).toBe(1);
    // En çok sayfa: bir istek en çok enCokSayfa × sayfa yorum okur. Sınırı aşacak kadar yayında yorum doğrudan
    // yazılır (müşterisiz).
    await vt.insert(yorumlar).values(
      Array.from({ length: yorumSinirlari.enCokSayfa + 3 }, (_, i) => ({
        urun_kimligi: urun,
        puan: 3,
        metin: `Ek ${i}`,
        ad: "Ek E.",
        durum: "yayinda",
      })),
    );
    const sinirli = await urunYorumlari(vt, urun, { sayfa: 999, boyut: 1 });
    expect(sinirli.sayfaSayisi).toBe(yorumSinirlari.enCokSayfa);
    expect(sinirli.yorumlar).toHaveLength(yorumSinirlari.enCokSayfa);
  });

  it("ana sayfa: işaretlenenler ya da en yeniler, yalnız listede görünen ürünlerin", async () => {
    await satinAlmaKapali();
    const kim = yonetici();
    const gorunen = await urunAc();
    const gizli = await urunAc("gizli");
    const isaretli = await yaz(await musteriAc(), gorunen, 5);
    const isaretsiz = await yaz(await musteriAc(), gorunen, 4);
    const gizlininki = await yaz(await musteriAc(), gizli, 5);
    for (const k of [isaretli, isaretsiz, gizlininki]) await servis.karar(vt, kim, k, "yayinda");
    await servis.anaSayfaIsareti(vt, kim, isaretli, true);
    await servis.anaSayfaIsareti(vt, kim, gizlininki, true);
    const an = new Date();
    const isaretlenenler = (
      await anaSayfaYorumlari(vt, { isaretlenenler: true, adet: 100, an })
    ).map((y) => y.kimlik);
    expect(isaretlenenler).toContain(isaretli);
    expect(isaretlenenler).not.toContain(isaretsiz);
    expect(isaretlenenler).not.toContain(gizlininki);
    const enYeniler = (await anaSayfaYorumlari(vt, { isaretlenenler: false, adet: 2, an })).map(
      (y) => y.kimlik,
    );
    expect(enYeniler).toEqual([isaretsiz, isaretli]);
    // Ürün taslağa dönünce yorumu ana sayfadan kalkar.
    await urunSrv.urunDegistir(vt, kim, gorunen, { durum: "taslak" });
    expect(
      (await anaSayfaYorumlari(vt, { isaretlenenler: true, adet: 100, an: new Date() })).map(
        (y) => y.kimlik,
      ),
    ).not.toContain(isaretli);
  });
});

describe("vitrine bağlantı", () => {
  it("ürün kartının puanı yayındaki yorumların ortalaması ve sayısıdır; yorumsuz üründe yok", async () => {
    await satinAlmaKapali();
    const kim = yonetici();
    const yorumlu = await urunAc();
    const yorumsuz = await urunAc();
    for (const [puan, durum] of [
      [5, "yayinda"],
      [2, "yayinda"],
      [1, "reddedildi"],
    ] as const) {
      const k = await yaz(await musteriAc(), yorumlu, puan);
      await servis.karar(vt, kim, k, durum);
    }
    await yaz(await musteriAc(), yorumlu, 1);
    const kartlar = await urunKartlari(vt, site, [yorumlu, yorumsuz], { yer: "liste" });
    expect(kartlar.map((kart) => kart.puan)).toEqual([{ ortalama: 3.5, sayi: 2 }, undefined]);
  });

  it("ana sayfa bağlamı: yorum bölümü varken iki kaynağın her adedi, yokken hiçbiri", async () => {
    await satinAlmaKapali();
    const kim = yonetici();
    const urun = await urunAc();
    const yayinda: string[] = [];
    for (let i = 0; i < 7; i++) {
      const k = await yaz(await musteriAc(), urun, 5);
      await servis.karar(vt, kim, k, "yayinda");
      yayinda.unshift(k);
    }
    await servis.anaSayfaIsareti(vt, kim, yayinda[3] ?? "", true);
    const bolum: BolumOrnegi = {
      kimlik: randomUUID(),
      tur: "musteri-yorumlari",
      gorunum: "kartlar",
      gizli: false,
      degerler: {},
    };
    const an = new Date();
    const baglam = await vitrinBaglaminiOku(vt, site, [bolum], bolumKutuphanesi, an);
    expect(Object.keys(baglam.yorumlar).toSorted()).toEqual(
      ["en-yeni:3", "en-yeni:6", "isaretlenenler:3", "isaretlenenler:6"].toSorted(),
    );
    expect(baglam.yorumlar["en-yeni:6"]?.map((y) => y.kimlik)).toEqual(yayinda.slice(0, 6));
    expect(baglam.yorumlar["en-yeni:3"]?.map((y) => y.kimlik)).toEqual(yayinda.slice(0, 3));
    expect(baglam.yorumlar["isaretlenenler:3"]?.map((y) => y.kimlik)).toContain(yayinda[3]);
    expect(Object.keys(baglam.yorumlar["en-yeni:3"]?.[0] ?? {}).toSorted()).toEqual([
      "ad",
      "kimlik",
      "metin",
      "puan",
    ]);
    expect((await vitrinBaglaminiOku(vt, site, [], bolumKutuphanesi, an)).yorumlar).toEqual({});
  });

  it("ürün sayfası: puan özeti, yorumlar ve doğrulanmış alıcı etiketi ayarı", async () => {
    await satinAlmaKapali();
    const urun = await urunAc();
    const k = await yaz(await musteriAc(), urun, 4);
    await servis.karar(vt, yonetici(), k, "yayinda");
    const veri = await urunSayfasiVerisi(vt, site, urun);
    expect(veri?.puan).toEqual({ ortalama: 4, sayi: 1, dagilim: [0, 1, 0, 0, 0] });
    expect(veri?.yorumlar.yorumlar.map((y) => y.kimlik)).toEqual([k]);
    expect(veri?.dogrulanmisAliciEtiketi).toBe(true);
    await siteninServisi(site).degistir(vt, yonetici(), { dogrulanmisAliciEtiketi: false });
    expect((await urunSayfasiVerisi(vt, site, urun))?.dogrulanmisAliciEtiketi).toBe(false);
  });
});

describe("veritabanı", () => {
  it("durum ve puan denetimi kayıtla aynı; denetim dışı satır yazılamaz", async () => {
    const tanim = async (ad: string) =>
      (
        await vt.execute<{ tanim: string }>(
          sql`select pg_get_constraintdef(oid) as tanim from pg_constraint where conname = ${ad}`,
        )
      ).rows[0]?.tanim ?? "";
    const durum = await tanim("yorumlar_durum");
    for (const ad of yorumDurumlari) expect(durum).toContain(`'${ad}'`);
    expect(durum.match(/'[^']+'/g)).toHaveLength(yorumDurumlari.length);
    expect(await tanim("yorumlar_puan")).toContain(
      `>= ${yorumSinirlari.enDusukPuan}) AND (puan <= ${yorumSinirlari.enYuksekPuan}`,
    );
    const urun = await urunAc();
    await expect(
      vt
        .insert(yorumlar)
        .values({ urun_kimligi: urun, puan: 6, metin: "x", ad: "x", durum: "yayinda" }),
    ).rejects.toThrow();
    await expect(
      vt
        .insert(yorumlar)
        .values({ urun_kimligi: urun, puan: 3, metin: "x", ad: "x", durum: "taslak" }),
    ).rejects.toThrow();
  });
});
