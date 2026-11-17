// Sepetin tek hesabı (kart 0212, karar 0135). Sepet sayfası, sepet penceresi, ödeme adımı ve sipariş tutarı yalnız
// buradan alır (.claude/rules/e-ticaret-is-kurallari.md: sepet, ödeme, sipariş ve e-postadaki tutar aynı hesaplama
// işlevinden gelir). Tarayıcıdan yalnız birimler ve adetler gelir; fiyat, kargo ve vergi burada yeniden hesaplanır.
//
// Kurallar:
// - Aynı birim iki kez verilirse adetleri toplanır. Sıra ilk geçtiği yerdir.
// - Satır yalnız sayfası açılan ürünün silinmemiş birimidir (vitrinKosulu, sayfa yeri); değilse "kaldırıldı".
// - Birim satılabilir değilse (stok, fiyat; stokDurumu, karar 0069 ve 0133) "tükendi": tutara girmez.
// - Adet ürünün en çok alım adedine, sepetin adet sınırına ve takibi açık üründe stoğa indirilir ("en-cok",
//   "stok-azaldi"); ürünün en az alım adedinin altındaysa "en-az" (ödemeye geçmeyi durdurur, adet değişmez).
// - Müşterinin son gördüğü birim fiyatı bugünkünden farklıysa "fiyat-degisti".
// - Vergi vergiHesapla ile, satırın girildiği biçimdeki geçerli tutarıyla; kargo kargoHesapla ile. Sepette müşterinin
//   adresi bilinmediği için vergi bölgesi mağaza adresidir. Ödeme adımı teslimat ve fatura adresinin bölgesini verir
//   (kart 0213); hangisinin kullanılacağı vergiAdresi ayarıdır (karar 0061).
// - Gösterilen tutarlar fiyat gösterimi ayarına göredir (vergi dahil ya da hariç): satır tutarı vergi hesabının
//   satırından, ara toplam satırların toplamı, toplam vergi hesabının vergili toplamıdır. Böylece ara toplam, kargo
//   ve vergi her zaman toplamı verir; birim fiyatla adetin çarpımı bir kuruş farklı olabilir.
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import {
  odemeyiDurduranUyarilar,
  type SepetUyarisi,
  sepetSinirlari,
} from "../../kayitlar/sepet.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { kimligiDuzelt, kimlikMi } from "../../veritabani/kimlik.ts";
import { fiyatGosterimServisi } from "../fiyat/gosterim.ts";
import { siteninFiyatServisi } from "../fiyat/servis.ts";
import { type KargoSonucu, kargoHesapla } from "../kargo/hesap.ts";
import { siteninStokAyarlari, stokDurumlari } from "../stok/durum.ts";
import { urunBirimleri, urunler } from "../urun/model.ts";
import { vitrinKosulu } from "../urun/vitrin.ts";
import type { DokumSatiri, VergiBolgesi } from "../vergi/hesap.ts";
import type { FiyatGirisi } from "../vergi/semalar.ts";
import { vergiHesapla } from "../vergi/servis.ts";
import type { SepetKalemi } from "./semalar.ts";

export type SepetSatirUyarisi =
  | { kod: Exclude<SepetUyarisi, "fiyat-degisti" | "stok-azaldi" | "en-az" | "en-cok"> }
  | { kod: "fiyat-degisti"; eskiTutar: number }
  | { kod: "stok-azaldi" | "en-cok" | "en-az"; sayi: number };

export type SepetHesapSatiri = {
  birim: string;
  // Sayfası açılmayan ya da olmayan birimde yoktur.
  urun?: string;
  istenenAdet: number;
  // Hesaba giren adet (sınırlara indirilmiş). Satılamayan satırda istenen adettir, tutara girmez.
  adet: number;
  // Müşterinin seçebileceği adet aralığı (ürünün alım sınırları, sepetin sınırı ve stok).
  enAz: number;
  enCok: number;
  satilabilir: boolean;
  kargoGerekmez: boolean;
  uyarilar: SepetSatirUyarisi[];
  // Satılabilir satırda: gösterim biçiminde birim fiyat ve satırın tutarı, kuruş.
  birimTutari?: number;
  tutar?: number;
  // Satılabilir satırda vergi hesabının sonucu: vergisiz tutar, vergi ve uygulanan oranlar (sipariş kalemine yazılır,
  // kart 0214). Vergi kapalıysa vergi 0, oran yoktur.
  vergi?: { vergisiz: number; vergi: number; oranlar: { ad?: string; oran: number }[] };
};

export type SepetHesabi = {
  satirlar: SepetHesapSatiri[];
  paraBirimi: string;
  // Tutarların vergi durumu; vergi kapalıysa "yok".
  gosterim: FiyatGirisi | "yok";
  // Satılabilir satırların toplam adedi.
  adet: number;
  araToplam: number;
  kargo: { tur: "yok" | "ucretsiz" } | { tur: "ucretli"; tutar: number; siniraKalan?: number };
  vergi: { dokum: DokumSatiri[]; toplam: number };
  toplam: number;
  // Satılamayan ya da alınamayacak adetteki satır yoksa ve sepette satılabilir ürün varsa.
  odemeyeGecilebilir: boolean;
};

// Aynı birim bir kez: adetler toplanır (sepetin adet sınırına kadar), sıra ilk geçtiği yer, son görülen fiyat ilkinin.
const birlestir = (kalemler: readonly SepetKalemi[]): SepetKalemi[] => {
  const sonuc = new Map<string, SepetKalemi>();
  for (const kalem of kalemler) {
    if (!kimlikMi(kalem.birim)) continue;
    const birim = kimligiDuzelt(kalem.birim);
    const onceki = sonuc.get(birim);
    sonuc.set(
      birim,
      onceki === undefined
        ? { ...kalem, birim }
        : { ...onceki, adet: Math.min(onceki.adet + kalem.adet, sepetSinirlari.adetEnCok) },
    );
  }
  return [...sonuc.values()].slice(0, sepetSinirlari.kalemEnCok);
};

export const sepetiHesapla = async (
  vt: Veritabani,
  site: Site,
  kalemler: readonly SepetKalemi[],
  {
    an = new Date(),
    adresler = {},
  }: {
    an?: Date;
    adresler?: { teslimat?: VergiBolgesi | undefined; fatura?: VergiBolgesi | undefined };
  } = {},
): Promise<SepetHesabi> => {
  const temiz = birlestir(kalemler);
  const birimler = temiz.map((kalem) => kalem.birim);
  const ayarlar = await siteninStokAyarlari(vt, site);
  const [satirlar, stoklar, gecerliler, gosterilecekler] = await Promise.all([
    birimler.length === 0
      ? []
      : vt
          .select({
            birim: urunBirimleri.kimlik,
            urun: urunler.kimlik,
            kargoGerekmez: urunler.kargo_gerekmez,
            enAz: urunler.en_az_adet,
            enCok: urunler.en_cok_adet,
            sinif: urunler.vergi_sinifi_kimligi,
          })
          .from(urunBirimleri)
          .innerJoin(urunler, eq(urunler.kimlik, urunBirimleri.urun_kimligi))
          .where(
            and(
              inArray(urunBirimleri.kimlik, birimler),
              isNull(urunBirimleri.silinme_zamani),
              vitrinKosulu("sayfa", { an, tukenenUrun: "goster" }),
            ),
          ),
    stokDurumlari(vt, birimler, ayarlar),
    siteninFiyatServisi(site).gecerliFiyatlar(vt, birimler, an),
    fiyatGosterimServisi(site).gosterilecekFiyatlar(vt, birimler, { an }),
  ]);
  const bilgiler = new Map(satirlar.map((satir) => [satir.birim, satir]));

  const hesapSatirlari = temiz.map((kalem): SepetHesapSatiri => {
    const bilgi = bilgiler.get(kalem.birim);
    const temel = { birim: kalem.birim, istenenAdet: kalem.adet, adet: kalem.adet };
    if (bilgi === undefined) {
      return {
        ...temel,
        enAz: 1,
        enCok: sepetSinirlari.adetEnCok,
        satilabilir: false,
        kargoGerekmez: false,
        uyarilar: [{ kod: "kaldirildi" }],
      };
    }
    const stok = stoklar.get(kalem.birim);
    const gosterilecek = gosterilecekler.get(kalem.birim);
    const urunSiniri = Math.min(bilgi.enCok ?? sepetSinirlari.adetEnCok, sepetSinirlari.adetEnCok);
    const stokSiniri = stok?.takip === true ? stok.miktar : sepetSinirlari.adetEnCok;
    const enCok = Math.min(urunSiniri, stokSiniri);
    const ortak = {
      ...temel,
      urun: bilgi.urun,
      enAz: bilgi.enAz,
      enCok: Math.max(enCok, 0),
      kargoGerekmez: bilgi.kargoGerekmez,
    };
    if (stok?.satilabilir !== true || gosterilecek === undefined || !gecerliler.has(kalem.birim)) {
      return { ...ortak, satilabilir: false, uyarilar: [{ kod: "tukendi" }] };
    }
    const uyarilar: SepetSatirUyarisi[] = [];
    let adet = kalem.adet;
    if (adet > enCok) {
      adet = enCok;
      uyarilar.push(
        stokSiniri < urunSiniri
          ? { kod: "stok-azaldi", sayi: enCok }
          : { kod: "en-cok", sayi: enCok },
      );
    }
    if (adet < bilgi.enAz) uyarilar.push({ kod: "en-az", sayi: bilgi.enAz });
    if (kalem.gorulenTutar !== undefined && kalem.gorulenTutar !== gosterilecek.tutar) {
      uyarilar.push({ kod: "fiyat-degisti", eskiTutar: kalem.gorulenTutar });
    }
    return { ...ortak, adet, satilabilir: true, uyarilar, birimTutari: gosterilecek.tutar };
  });

  // Vergi ve kargo yalnız satılabilir satırlarla, girildiği biçimdeki tutarla.
  const satilanlar = hesapSatirlari.filter((satir) => satir.satilabilir);
  const kalemTutarlari = satilanlar.map((satir) => {
    const gecerli = gecerliler.get(satir.birim);
    const bilgi = bilgiler.get(satir.birim);
    if (gecerli === undefined || bilgi === undefined) throw new Error("Satırın fiyatı yok.");
    return { satir, gecerli, sinif: bilgi.sinif };
  });
  const kargo: KargoSonucu = kargoHesapla(
    ayarlar,
    kalemTutarlari.map(({ satir, gecerli }) => ({
      tutar: gecerli.tutar * satir.adet,
      indirimsizTutar: gecerli.satisFiyati * satir.adet,
      kargoGerekmez: satir.kargoGerekmez,
    })),
  );
  const vergi =
    kalemTutarlari.length === 0
      ? undefined
      : await vergiHesapla(
          vt,
          {
            satirlar: kalemTutarlari.map(({ satir, gecerli, sinif }) => ({
              birimFiyat: gecerli.tutar,
              adet: satir.adet,
              sinif,
            })),
            ...(kargo.tur === "ucretli" ? { kargo: { tutar: kargo.tutar } } : {}),
            ...(adresler.teslimat === undefined ? {} : { teslimatAdresi: adresler.teslimat }),
            ...(adresler.fatura === undefined ? {} : { faturaAdresi: adresler.fatura }),
          },
          site,
        );

  const gosterim: SepetHesabi["gosterim"] = ayarlar.vergiAcik ? ayarlar.fiyatGosterimi : "yok";
  const goster = (sonuc: { vergili: number; vergisiz: number }) =>
    gosterim === "vergi-haric" ? sonuc.vergisiz : sonuc.vergili;
  kalemTutarlari.forEach(({ satir }, sira) => {
    const sonuc = vergi?.satirlar[sira];
    if (sonuc === undefined) return;
    satir.tutar = goster(sonuc);
    satir.vergi = {
      vergisiz: sonuc.vergisiz,
      vergi: sonuc.vergi,
      oranlar: sonuc.oranlar.map(({ ad, oran }) => (ad === undefined ? { oran } : { ad, oran })),
    };
  });
  const araToplam = satilanlar.reduce((toplam, satir) => toplam + (satir.tutar ?? 0), 0);
  const odemeyiDurduran = hesapSatirlari.some(
    (satir) =>
      !satir.satilabilir ||
      satir.uyarilar.some((uyari) => odemeyiDurduranUyarilar.includes(uyari.kod)),
  );
  return {
    satirlar: hesapSatirlari,
    paraBirimi: site.ayarlar.paraBirimi,
    gosterim,
    adet: satilanlar.reduce((toplam, satir) => toplam + satir.adet, 0),
    araToplam,
    kargo:
      kargo.tur === "ucretli"
        ? {
            tur: "ucretli",
            tutar: vergi?.kargo === undefined ? kargo.tutar : goster(vergi.kargo),
            ...(kargo.siniraKalan === undefined ? {} : { siniraKalan: kargo.siniraKalan }),
          }
        : { tur: kargo.tur },
    vergi: { dokum: vergi?.dokum ?? [], toplam: vergi?.toplam.vergi ?? 0 },
    toplam: vergi?.toplam.vergili ?? 0,
    odemeyeGecilebilir: satilanlar.length > 0 && !odemeyiDurduran,
  };
};
