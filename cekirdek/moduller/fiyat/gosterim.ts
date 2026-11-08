// Gösterilecek fiyatın tek işlevi (kart 0081, karar 0067). Vitrin, sepet ve e-posta bir birimin
// fiyatını yalnız buradan alır: geçerli fiyat, vergi durumu, eski fiyat, fiyatın yanındaki metin ve
// sitenin para biçimiyle yazılmış hâlleri bir arada gelir.
//
// - Tutar, fiyatın girildiği biçimden (fiyatGirisi) gösterim biçimine (fiyatGosterimi) vergi hesabıyla
//   (cekirdek/moduller/vergi/hesap.ts) çevrilir; ikisi aynıysa ya da vergi kapalıysa hesap yapılmaz.
//   Bölge verilmezse (ürün sayfasında müşterinin adresi bilinmez) mağaza adresi kullanılır. Her tutar
//   tek başına, bir adet olarak çevrilir; sepet toplamı vergiyi kendi satırlarıyla hesaplar.
// - Eski fiyat geçmişten bulunur (eski-fiyat.ts) ve aynı biçimde çevrilir.
// - Fiyatın yanındaki metin mağaza sahibinin ayarıdır (fiyatEkMetni). Yazılmamışsa vergi adından ve
//   tutarın vergi durumundan kurulur; vergi kapalıysa ya da ürün vergisizse metin yoktur; boş metin
//   hiçbir şey göstermez.
// - Para birimi ve biçimi site ayarındadır; tutar ortak biçimleyiciden geçer. Çekirdekte para simgesi
//   ve vergi adı yazmaz.
//
// Bütün birimler birkaç sorguyla gelir, birim başına sorgu atılmaz.
import { eq, inArray } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { hatayiKaydet } from "../../izleme/hata-katmani.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { siteninBicimleyicisi } from "../../metinler/site-metni.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { doldur } from "../eposta/sablon.ts";
import { siteninMagazaAyarlari } from "../magaza-ayarlari/servis.ts";
import { urunBirimleri, urunler } from "../urun/model.ts";
import { hesapla, type VergiBolgesi } from "../vergi/hesap.ts";
import type { FiyatGirisi } from "../vergi/semalar.ts";
import { siteninVergiServisi, type VergiSinifi } from "../vergi/servis.ts";
import { eskiFiyatiBul } from "./eski-fiyat.ts";
import { type FiyatGecmisiSatiri, siteninFiyatServisi } from "./servis.ts";

export type GosterilecekFiyat = {
  // O anda ödenecek tutar, gösterim biçiminde (vergi dahil ya da hariç), kuruş.
  tutar: number;
  // İndirimdeyse ve gösterilecek eski fiyat varsa, aynı biçimde.
  eskiTutar?: number;
  indirimde: boolean;
  paraBirimi: string;
  // Tutarın vergi durumu; vergi kapalıysa ya da ürün vergisizse "yok".
  vergi: FiyatGirisi | "yok";
  ekMetin?: string;
  // Sitenin para biçimiyle yazılmış hâlleri.
  yazili: { tutar: string; eskiTutar?: string };
};

type Ayarlar = Awaited<ReturnType<typeof siteninMagazaAyarlari>>;
type VergiDurumu = GosterilecekFiyat["vergi"];

// Fiyatın yanındaki metin, tutarın gerçek vergi durumuna göre. Mağaza sahibinin metni her zaman
// görünür (boşsa hiçbir şey); yazılmamışsa metin vergi adından kurulur, vergi yoksa (vergi kapalı ya da
// vergisiz ürün) metin yoktur.
export const ekMetniBul = (
  ayarlar: Ayarlar,
  dil: Site["ayarlar"]["dil"],
  vergi: VergiDurumu,
): string | undefined => {
  if (ayarlar.fiyatEkMetni !== undefined) {
    return ayarlar.fiyatEkMetni === "" ? undefined : ayarlar.fiyatEkMetni;
  }
  if (vergi === "yok") return undefined;
  const metin = metinOkuyucu(dil);
  const dahil = vergi === "vergi-dahil";
  if (ayarlar.vergiAdi === undefined) {
    return metin(dahil ? "vitrin.fiyat.vergilerDahil" : "vitrin.fiyat.vergilerHaric");
  }
  return doldur(metin(dahil ? "vitrin.fiyat.vergiDahil" : "vitrin.fiyat.vergiHaric"), {
    vergi: ayarlar.vergiAdi,
  });
};

// Süreçte bir kez kaydedilen çevirme hatası: her vitrin açılışında yeniden kaydedilmesin.
let bolgeHatasiKaydedildi = false;

export const fiyatGosterimServisi = (site: Site) => {
  const fiyat = siteninFiyatServisi(site);

  const gosterilecekFiyatlar = async (
    vt: Veritabani,
    birimler: string[],
    secenekler: { an?: Date; bolge?: VergiBolgesi } = {},
  ): Promise<Map<string, GosterilecekFiyat>> => {
    const an = secenekler.an ?? new Date();
    const gecerliler = await fiyat.gecerliFiyatlar(vt, birimler, an);
    const sonuc = new Map<string, GosterilecekFiyat>();
    if (gecerliler.size === 0) return sonuc;
    const ayarlar = await siteninMagazaAyarlari(vt, site);
    const indirimdekiler = [...gecerliler].filter(([, g]) => g.indirimde).map(([birim]) => birim);
    const gecmisler =
      indirimdekiler.length === 0
        ? new Map<string, FiyatGecmisiSatiri[]>()
        : await fiyat.gecmisleriOku(vt, indirimdekiler, an);
    // Birimin ürününün vergi sınıfı; null vergisiz üründür.
    const siniflar = new Map(
      (
        await vt
          .select({ birim: urunBirimleri.kimlik, sinif: urunler.vergi_sinifi_kimligi })
          .from(urunBirimleri)
          .innerJoin(urunler, eq(urunler.kimlik, urunBirimleri.urun_kimligi))
          .where(inArray(urunBirimleri.kimlik, [...gecerliler.keys()]))
      ).map((satir) => [satir.birim, satir.sinif]),
    );

    // Tutarı gösterim biçimine çevirir. Vergi kapalıysa ya da ürün vergisizse çevrilmez ve vergi yoktur.
    // Giriş ve gösterim aynıysa hesap yapılmaz. Bölge bulunamazsa (mağaza adresi yok ya da tabloda
    // değil) tutar girildiği biçimde, kendi vergi durumuyla gösterilir ve hata bir kez kaydedilir:
    // tutar ve metni birbirini tutar, vitrin düşmez.
    const cevirmeli = ayarlar.vergiAcik && ayarlar.fiyatGirisi !== ayarlar.fiyatGosterimi;
    const tablo: VergiSinifi[] =
      cevirmeli && [...siniflar.values()].some((sinif) => sinif !== null)
        ? await siteninVergiServisi(site).tabloyuOku(vt, { silinmisSiniflar: true })
        : [];
    const magaza = ayarlar.magazaAdresi;
    const adresler = {
      ...(secenekler.bolge === undefined ? {} : { teslimat: secenekler.bolge }),
      ...(magaza === undefined
        ? {}
        : { magaza: { ulke: magaza.ulke, il: magaza.il, postaKodu: magaza.postaKodu } }),
    };
    const cevir = (tutarlar: number[], sinif: string): number[] =>
      tutarlar.map((tutar) => {
        const [kalem] = hesapla({
          ayarlar: {
            ...ayarlar,
            // Bölge verilmediyse mağaza adresi: ayardaki adres yoksa hesap mağazaya düşer.
            vergiAdresi: secenekler.bolge === undefined ? "magaza" : "teslimat",
          },
          tablo,
          adresler,
          satirlar: [{ birimFiyat: tutar, adet: 1, sinif }],
        }).satirlar;
        if (kalem === undefined) throw new Error("Vergi hesabı kalem döndürmedi.");
        return ayarlar.fiyatGosterimi === "vergi-dahil" ? kalem.vergili : kalem.vergisiz;
      });
    const gosterime = (
      tutarlar: number[],
      birim: string,
    ): { tutarlar: number[]; vergi: VergiDurumu } => {
      const sinif = siniflar.get(birim) ?? null;
      if (!ayarlar.vergiAcik || sinif === null) return { tutarlar, vergi: "yok" };
      if (!cevirmeli) return { tutarlar, vergi: ayarlar.fiyatGosterimi };
      try {
        return { tutarlar: cevir(tutarlar, sinif), vergi: ayarlar.fiyatGosterimi };
      } catch (hata) {
        if (!(hata instanceof BilinenHata) || hata.kod !== "is-kurali") throw hata;
        if (!bolgeHatasiKaydedildi) {
          bolgeHatasiKaydedildi = true;
          hatayiKaydet(hata, { kaynak: "fiyat-gosterimi", ayrinti: hata.ayrinti });
        }
        return { tutarlar, vergi: ayarlar.fiyatGirisi };
      }
    };

    const bicim = siteninBicimleyicisi(site.ayarlar);
    for (const [birim, gecerli] of gecerliler) {
      const eski = gecerli.indirimde
        ? eskiFiyatiBul(
            gecmisler.get(birim) ?? [],
            an,
            gecerli.paraBirimi,
            ayarlar.indirimdeEnDusukFiyat,
          )
        : undefined;
      const {
        tutarlar: [tutar = gecerli.tutar, cevrilmisEski],
        vergi,
      } = gosterime(eski === undefined ? [gecerli.tutar] : [gecerli.tutar, eski], birim);
      // Çevrilince iki tutar aynı kuruşa yuvarlanabilir: eski fiyat yine yüksek değilse gösterilmez.
      const eskiTutar =
        cevrilmisEski !== undefined && cevrilmisEski > tutar ? cevrilmisEski : undefined;
      const ekMetin = ekMetniBul(ayarlar, site.ayarlar.dil, vergi);
      sonuc.set(birim, {
        tutar,
        ...(eskiTutar === undefined ? {} : { eskiTutar }),
        indirimde: gecerli.indirimde,
        paraBirimi: gecerli.paraBirimi,
        vergi,
        ...(ekMetin === undefined ? {} : { ekMetin }),
        yazili: {
          tutar: bicim.para(tutar),
          ...(eskiTutar === undefined ? {} : { eskiTutar: bicim.para(eskiTutar) }),
        },
      });
    }
    return sonuc;
  };

  return { gosterilecekFiyatlar };
};
