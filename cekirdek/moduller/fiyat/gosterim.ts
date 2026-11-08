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
//   gösterimden kurulur; vergi kapalıysa metin yoktur; boş metin hiçbir şey göstermez.
// - Para birimi ve biçimi site ayarındadır; tutar ortak biçimleyiciden geçer. Çekirdekte para simgesi
//   ve vergi adı yazmaz.
//
// Bütün birimler birkaç sorguyla gelir, birim başına sorgu atılmaz.
import { eq, inArray } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
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
import { siteninFiyatServisi } from "./servis.ts";

export type GosterilecekFiyat = {
  // O anda ödenecek tutar, gösterim biçiminde (vergi dahil ya da hariç), kuruş.
  tutar: number;
  // İndirimdeyse ve gösterilecek eski fiyat varsa, aynı biçimde.
  eskiTutar?: number;
  indirimde: boolean;
  paraBirimi: string;
  // Tutarın vergi durumu; vergi kapalıysa "yok".
  vergi: FiyatGirisi | "yok";
  ekMetin?: string;
  // Sitenin para biçimiyle yazılmış hâlleri.
  yazili: { tutar: string; eskiTutar?: string };
};

type Ayarlar = Awaited<ReturnType<typeof siteninMagazaAyarlari>>;

// Fiyatın yanındaki metin.
export const ekMetniBul = (ayarlar: Ayarlar, dil: Site["ayarlar"]["dil"]): string | undefined => {
  if (ayarlar.fiyatEkMetni !== undefined) {
    return ayarlar.fiyatEkMetni === "" ? undefined : ayarlar.fiyatEkMetni;
  }
  if (!ayarlar.vergiAcik) return undefined;
  const metin = metinOkuyucu(dil);
  const dahil = ayarlar.fiyatGosterimi === "vergi-dahil";
  if (ayarlar.vergiAdi === undefined) {
    return metin(dahil ? "vitrin.fiyat.vergilerDahil" : "vitrin.fiyat.vergilerHaric");
  }
  return doldur(metin(dahil ? "vitrin.fiyat.vergiDahil" : "vitrin.fiyat.vergiHaric"), {
    vergi: ayarlar.vergiAdi,
  });
};

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
      indirimdekiler.length === 0 ? new Map() : await fiyat.gecmisleriOku(vt, indirimdekiler, an);

    const cevirmeli = ayarlar.vergiAcik && ayarlar.fiyatGirisi !== ayarlar.fiyatGosterimi;
    let cevir = (tutar: number, _birim: string) => tutar;
    if (cevirmeli) {
      const siniflar = new Map(
        (
          await vt
            .select({ birim: urunBirimleri.kimlik, sinif: urunler.vergi_sinifi_kimligi })
            .from(urunBirimleri)
            .innerJoin(urunler, eq(urunler.kimlik, urunBirimleri.urun_kimligi))
            .where(inArray(urunBirimleri.kimlik, [...gecerliler.keys()]))
        ).map((satir) => [satir.birim, satir.sinif]),
      );
      const tablo: VergiSinifi[] = await siteninVergiServisi(site).tabloyuOku(vt, {
        silinmisSiniflar: true,
      });
      const magaza = ayarlar.magazaAdresi;
      const adresler = {
        ...(secenekler.bolge === undefined ? {} : { teslimat: secenekler.bolge }),
        ...(magaza === undefined
          ? {}
          : { magaza: { ulke: magaza.ulke, il: magaza.il, postaKodu: magaza.postaKodu } }),
      };
      cevir = (tutar, birim) => {
        const [kalem] = hesapla({
          ayarlar: {
            ...ayarlar,
            // Bölge verilmediyse mağaza adresi: ayardaki adres yoksa hesap mağazaya düşer.
            vergiAdresi: secenekler.bolge === undefined ? "magaza" : "teslimat",
          },
          tablo,
          adresler,
          satirlar: [{ birimFiyat: tutar, adet: 1, sinif: siniflar.get(birim) ?? null }],
        }).satirlar;
        if (kalem === undefined) throw new Error("Vergi hesabı kalem döndürmedi.");
        return ayarlar.fiyatGosterimi === "vergi-dahil" ? kalem.vergili : kalem.vergisiz;
      };
    }

    const bicim = siteninBicimleyicisi(site.ayarlar);
    const ekMetin = ekMetniBul(ayarlar, site.ayarlar.dil);
    for (const [birim, gecerli] of gecerliler) {
      const tutar = cevir(gecerli.tutar, birim);
      const eski = gecerli.indirimde
        ? eskiFiyatiBul(
            gecmisler.get(birim) ?? [],
            an,
            gecerli.paraBirimi,
            ayarlar.indirimdeEnDusukFiyat,
          )
        : undefined;
      const eskiTutar = eski === undefined ? undefined : cevir(eski, birim);
      sonuc.set(birim, {
        tutar,
        ...(eskiTutar === undefined ? {} : { eskiTutar }),
        indirimde: gecerli.indirimde,
        paraBirimi: gecerli.paraBirimi,
        vergi: ayarlar.vergiAcik ? ayarlar.fiyatGosterimi : "yok",
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
