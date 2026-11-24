// Panelin yorum listesi gerçek veritabanıyla (kart 0277, karar 0174):
// - Durum süzgeci ve durum sayıları: sayılar puana ve aramaya uyar, duruma uymaz.
// - Silinmiş ürünün yorumu listede, sayılarda ve menüdeki sayıda yoktur.
// - Arama ürünün adında ve kısaltılmış adda; Türkçe harfsiz, büyük harfle ve ortadan; % ve _ joker değildir.
// - Puan süzgeci birden çok değer alır. Dört sıralama, eşitlikte en yeni önce. Sınır dışı sayfa son sayfaya çekilir.
// - Satırın "vitrinde" bilgisi ürünün sayfasının açılıp açılmadığıdır.
// - Toplu karar: her yorum tekil kararla, kendi işleminde; olmayan kimlik nedeniyle döner, ötekiler işlenir; aynı yorum
//   iki kez verilse de bir kez işlenir; değişiklik kaydı yazanla. Ekranın gördüğü durum eskiyse yorum işlenmez
//   (yorum-degisti). Kararın kuralları (bağımsız kontrolün bulguları): reddedilen yorumun ana sayfa işareti kalkar,
//   ürünü silinmiş yorum bulunamadı alır.
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import type { YorumDurumu } from "../../../kayitlar/yorum.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { siteninServisi } from "../../magaza-ayarlari/servis.ts";
import { hesapAc } from "../../oturum/servis.ts";
import { urunServisi } from "../../urun/servis.ts";
import { yorumlar } from "../model.ts";
import {
  onayBekleyenYorumSayisi,
  type YorumPanelListesiGirdisi,
  yorumPanelListesi,
  yorumTopluKarar,
} from "../panel-listesi.ts";
import { yorumServisi } from "../servis.ts";

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
  ({ vt, sil } = await denemeSitesiAc("yorum-paneli"));
  await siteninServisi(site).degistir(vt, yonetici(), { yorumYalnizSatinAlanlar: false });
});
afterAll(async () => {
  await sil();
});

// Her test kendi ürünlerini adında ortak bir etiketle açar; liste o etiketle aranarak testin yorumlarına süzülür.
const etiket = () => `Kz${randomUUID().slice(0, 6)}`;
const urunAc = (ad: string, durum: "yayinda" | "taslak" | "gizli" | "arsiv" = "yayinda") =>
  urunSrv.urunEkle(vt, yonetici(), { ad, vergiSinifi: null, durum });
const yaz = async (urun: string, puan: number, ad = "Deneme Müşteri") => {
  const musteri = (
    await hesapAc(vt, "musteri", {
      eposta: `m-${randomUUID().slice(0, 8)}@ornek.test`,
      sifre: "uzun-bir-deneme-sifresi",
    })
  ).hesapKimligi;
  return servis.yorumYaz(vt, musteri, { urun, puan, metin: `Deneme ${puan}`, ad });
};
const kararVer = (yorum: string, durum: YorumDurumu) =>
  servis.karar(vt, yonetici(), yorum, durum as "yayinda" | "reddedildi");
const liste = (girdi: Partial<YorumPanelListesiGirdisi>) =>
  yorumPanelListesi(vt, { siralama: "en-yeni", sayfa: 1, sayfaBoyu: 25, ...girdi });
const kimlikler = async (girdi: Partial<YorumPanelListesiGirdisi>) =>
  (await liste(girdi)).satirlar.map((satir) => satir.kimlik);

describe("durum, sayılar ve silinmiş ürün", () => {
  it("sayılar puana ve aramaya uyar, duruma uymaz; silinmiş ürünün yorumu hiçbir yerde yok", async () => {
    const e = etiket();
    const urun = await urunAc(`${e} Kulaklık`);
    const silinecek = await urunAc(`${e} Termos`);
    const bekleyen = await yaz(urun, 5);
    const yayinda = await yaz(urun, 4);
    const reddedilen = await yaz(urun, 2);
    await kararVer(yayinda, "yayinda");
    await kararVer(reddedilen, "reddedildi");
    const silinmisin = await yaz(silinecek, 5);
    const oncekiSayi = await onayBekleyenYorumSayisi(vt);

    const sonuc = await liste({ ara: e, durum: "onay-bekliyor" });
    expect(sonuc.satirlar.map((s) => s.kimlik)).toEqual([silinmisin, bekleyen]);
    expect(sonuc.durumSayilari).toEqual({ "onay-bekliyor": 2, yayinda: 1, reddedildi: 1 });
    expect(sonuc.toplam).toBe(2);
    // Puan süzgeci sayılara da uygulanır.
    expect((await liste({ ara: e, puan: [4, 2] })).durumSayilari).toEqual({
      "onay-bekliyor": 0,
      yayinda: 1,
      reddedildi: 1,
    });
    expect(await kimlikler({ ara: e, durum: "yayinda" })).toEqual([yayinda]);
    expect(await kimlikler({ ara: e, durum: "reddedildi" })).toEqual([reddedilen]);
    expect(await kimlikler({ ara: e })).toEqual([silinmisin, reddedilen, yayinda, bekleyen]);

    await urunSrv.urunSil(vt, yonetici(), silinecek);
    const sonra = await liste({ ara: e, durum: "onay-bekliyor" });
    expect(sonra.satirlar.map((s) => s.kimlik)).toEqual([bekleyen]);
    expect(sonra.durumSayilari["onay-bekliyor"]).toBe(1);
    expect(await onayBekleyenYorumSayisi(vt)).toBe(oncekiSayi - 1);
  });

  it("satır yorumun ve ürünün bilgisini taşır; vitrinde ürünün sayfası açılıyorsa", async () => {
    const e = etiket();
    const yayindaUrun = await urunAc(`${e} Açık`);
    const gizliUrun = await urunAc(`${e} Gizli`, "gizli");
    const yorumA = await yaz(yayindaUrun, 3, "Zübeyde Kaya");
    const yorumB = await yaz(gizliUrun, 5);
    await urunSrv.urunDegistir(vt, yonetici(), yayindaUrun, { durum: "taslak" });
    const satirlar = (await liste({ ara: e })).satirlar;
    const a = satirlar.find((s) => s.kimlik === yorumA);
    expect(a).toMatchObject({
      puan: 3,
      metin: "Deneme 3",
      ad: "Zübeyde K.",
      baslik: null,
      dogrulanmisAlici: false,
      durum: "onay-bekliyor",
      anaSayfada: false,
      urun: { kimlik: yayindaUrun, ad: `${e} Açık`, vitrinde: false },
    });
    expect(satirlar.find((s) => s.kimlik === yorumB)?.urun.vitrinde).toBe(true);
  });
});

describe("arama, puan ve sıralama", () => {
  it("ürün adında ve kısa adda arar: Türkçe harfsiz, büyük harfle, ortadan; % ve _ joker değil", async () => {
    const e = etiket();
    const cigdem = await urunAc(`${e} ÇİĞDEM Şal`);
    const yuzde = await urunAc(`${e} Yüzde_100`);
    const cig = await yaz(cigdem, 4, "Hasan Öztürk");
    const yuz = await yaz(yuzde, 4, "Ömer Işık");
    expect(await kimlikler({ ara: `${e} cigdem` })).toEqual([cig]);
    expect(await kimlikler({ ara: `${e.toUpperCase()} ÇİĞDEM ŞAL` })).toEqual([cig]);
    expect(await kimlikler({ ara: "dem sa" })).toContain(cig);
    // Kısaltılmış ad: "Hasan Ö." (soyadı saklanmaz, aranamaz).
    expect(await kimlikler({ ara: "hasan o." })).toContain(cig);
    expect(await kimlikler({ ara: "ozturk" })).not.toContain(cig);
    expect(await kimlikler({ ara: "omer i" })).toContain(yuz);
    expect(await kimlikler({ ara: `${e} Yüzde_100` })).toEqual([yuz]);
    expect(await kimlikler({ ara: `${e} Yüzde%` })).toEqual([]);
    expect(await kimlikler({ ara: `${e} Yüzde_1_` })).toEqual([]);
  });

  it("puan süzgeci birden çok değer alır; dört sıralama, eşitlikte en yeni önce", async () => {
    const e = etiket();
    const urun = await urunAc(`${e} Kupa`);
    const ilk3 = await yaz(urun, 3);
    const bes = await yaz(urun, 5);
    const bir = await yaz(urun, 1);
    const son3 = await yaz(urun, 3);
    expect(await kimlikler({ ara: e, puan: [5, 1] })).toEqual([bir, bes]);
    expect(await kimlikler({ ara: e, siralama: "en-yeni" })).toEqual([son3, bir, bes, ilk3]);
    expect(await kimlikler({ ara: e, siralama: "en-eski" })).toEqual([ilk3, bes, bir, son3]);
    expect(await kimlikler({ ara: e, siralama: "puan-artan" })).toEqual([bir, son3, ilk3, bes]);
    expect(await kimlikler({ ara: e, siralama: "puan-azalan" })).toEqual([bes, son3, ilk3, bir]);
  });

  it("sayfa sayfa okunur; sınır dışı sayfa son sayfaya çekilir", async () => {
    const e = etiket();
    const urun = await urunAc(`${e} Defter`);
    const yazilanlar: string[] = [];
    for (let i = 0; i < 27; i++) yazilanlar.push(await yaz(urun, 4));
    const ikinci = await liste({ ara: e, sayfa: 2 });
    expect(ikinci).toMatchObject({ toplam: 27, sayfa: 2, sayfaSayisi: 2, sayfaBoyu: 25 });
    expect(ikinci.satirlar.map((s) => s.kimlik)).toEqual(yazilanlar.slice(0, 2).reverse());
    expect((await liste({ ara: e, sayfa: 99 })).sayfa).toBe(2);
    expect((await liste({ ara: e, sayfa: 0 })).sayfa).toBe(1);
  });
});

describe("toplu karar", () => {
  it("her yorum kendi işleminde karar alır; bulunamayan nedeniyle döner, ötekiler işlenir", async () => {
    const e = etiket();
    const urun = await urunAc(`${e} Lamba`);
    const a = await yaz(urun, 5);
    const b = await yaz(urun, 4);
    const kim = yonetici();
    const olmayan = randomUUID();
    const bekliyor = "onay-bekliyor" as const;
    const sonuc = await yorumTopluKarar(vt, site, kim, {
      islem: "yayinla",
      yorumlar: [
        { yorum: a, gorulen: bekliyor },
        { yorum: olmayan, gorulen: bekliyor },
        { yorum: b.toUpperCase(), gorulen: bekliyor },
        { yorum: b, gorulen: bekliyor },
      ],
    });
    expect(sonuc.islenen.sort()).toEqual([a, b].sort());
    expect(sonuc.islenemeyen).toEqual([{ anahtar: olmayan, kod: "yorum-yok" }]);
    expect(await kimlikler({ ara: e, durum: "yayinda" })).toEqual([b, a]);
    const kayitlar = await vt
      .select()
      .from(degisiklikKayitlari)
      .where(
        and(
          eq(degisiklikKayitlari.islem, "yorum.durum-degisti"),
          eq(degisiklikKayitlari.kim_kimligi, kim.kimlik),
        ),
      );
    expect(kayitlar).toHaveLength(2);

    // Reddet: yayındaki yorum reddedilir; zaten reddedilmiş olan yeniden kayda girmez.
    const ret = await yorumTopluKarar(vt, site, kim, {
      islem: "reddet",
      yorumlar: [{ yorum: a, gorulen: "yayinda" }],
    });
    expect(ret).toEqual({ islenen: [a], islenemeyen: [] });
    await yorumTopluKarar(vt, site, kim, {
      islem: "reddet",
      yorumlar: [{ yorum: a, gorulen: "reddedildi" }],
    });
    const [satir] = await vt.select().from(yorumlar).where(eq(yorumlar.kimlik, a));
    expect(satir?.durum).toBe("reddedildi");
    const retKayitlari = await vt
      .select()
      .from(degisiklikKayitlari)
      .where(
        and(
          eq(degisiklikKayitlari.kayit_kimligi, a),
          eq(degisiklikKayitlari.islem, "yorum.durum-degisti"),
        ),
      );
    expect(retKayitlari).toHaveLength(2);
  });

  it("ekranın gördüğü durum eskiyse yorum işlenmez, ötekiler işlenir; tekil kararda da çakışma", async () => {
    const e = etiket();
    const urun = await urunAc(`${e} Vazo`);
    const a = await yaz(urun, 5);
    const b = await yaz(urun, 4);
    // Başka bir yönetici a'yı arada reddetti; bu ekran onu hâlâ onay bekliyor görüyor.
    await kararVer(a, "reddedildi");
    const sonuc = await yorumTopluKarar(vt, site, yonetici(), {
      islem: "yayinla",
      yorumlar: [
        { yorum: a, gorulen: "onay-bekliyor" },
        { yorum: b, gorulen: "onay-bekliyor" },
      ],
    });
    expect(sonuc).toEqual({ islenen: [b], islenemeyen: [{ anahtar: a, kod: "yorum-degisti" }] });
    expect(await kimlikler({ ara: e, durum: "reddedildi" })).toEqual([a]);
    const hata = await servis.karar(vt, yonetici(), a, "yayinda", "onay-bekliyor").then(
      () => undefined,
      (h: { kod?: string; ayrinti?: unknown }) => ({ kod: h.kod, ayrinti: h.ayrinti }),
    );
    expect(hata).toEqual({ kod: "cakisma", ayrinti: [{ alan: "yorum", kod: "yorum-degisti" }] });
    expect(await kimlikler({ ara: e, durum: "reddedildi" })).toEqual([a]);
  });

  it("reddedilen yorumun ana sayfa işareti kalkar ve kayda girer; yeniden yayınlanınca işaretsizdir", async () => {
    const e = etiket();
    const urun = await urunAc(`${e} Fincan`);
    const a = await yaz(urun, 5);
    await kararVer(a, "yayinda");
    await servis.anaSayfaIsareti(vt, yonetici(), a, true);
    await kararVer(a, "reddedildi");
    const [satir] = await vt.select().from(yorumlar).where(eq(yorumlar.kimlik, a));
    expect(satir).toMatchObject({ durum: "reddedildi", ana_sayfada: false });
    const [kayit] = await vt
      .select()
      .from(degisiklikKayitlari)
      .where(
        and(
          eq(degisiklikKayitlari.kayit_kimligi, a),
          eq(degisiklikKayitlari.islem, "yorum.durum-degisti"),
          eq(degisiklikKayitlari.yeni_deger, { durum: "reddedildi", anaSayfada: false }),
        ),
      );
    expect(kayit?.eski_deger).toEqual({ durum: "yayinda", anaSayfada: true });
    await kararVer(a, "yayinda");
    expect((await liste({ ara: e, durum: "yayinda" })).satirlar[0]?.anaSayfada).toBe(false);
  });

  it("ürünü silinmiş yorum karar ve işaret alamaz (bulunamadı), toplu kararda nedeniyle döner", async () => {
    const e = etiket();
    const urun = await urunAc(`${e} Tabak`);
    const a = await yaz(urun, 3);
    await urunSrv.urunSil(vt, yonetici(), urun);
    for (const vaat of [
      servis.karar(vt, yonetici(), a, "yayinda"),
      servis.anaSayfaIsareti(vt, yonetici(), a, true),
    ]) {
      expect(
        await vaat.then(
          () => "yazildi",
          (h: { kod?: string }) => h.kod,
        ),
      ).toBe("bulunamadi");
    }
    expect(
      await yorumTopluKarar(vt, site, yonetici(), {
        islem: "yayinla",
        yorumlar: [{ yorum: a, gorulen: "onay-bekliyor" }],
      }),
    ).toEqual({ islenen: [], islenemeyen: [{ anahtar: a, kod: "yorum-yok" }] });
    const [satir] = await vt.select().from(yorumlar).where(eq(yorumlar.kimlik, a));
    expect(satir?.durum).toBe("onay-bekliyor");
  });
});
