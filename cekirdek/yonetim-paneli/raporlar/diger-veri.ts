// Ürün, müşteri ve kupon raporlarının ekran verisi (kart 0318, karar 0196), sunucuda. Sayılar rapor modülünden
// (cekirdek/moduller/rapor/), dönemin kısmı ve sayı kutuları veri.ts'ten. Tablolar sayfa sayfadır (panelSayfaBoyu),
// sınır dışı sayfa son sayfaya çekilir; CSV bütün satırları verir.
import type { Site } from "../../ayar-semasi/site-klasoru";
import { doldur } from "../../metinler/doldur";
import { metin } from "../../metinler/site-metni";
import { siteninMagazaAyarlari } from "../../moduller/magaza-ayarlari/servis";
import { type KuponOzeti, type KuponRaporuSatiri, kuponRaporu } from "../../moduller/rapor/kupon";
import {
  type MusteriOzeti,
  type MusteriRaporuSatiri,
  musteriRaporu,
} from "../../moduller/rapor/musteri";
import { type UrunRaporuSatiri, urunRaporu } from "../../moduller/rapor/urun";
import type { Veritabani } from "../../veritabani/baglanti";
import { kuponAdresi, musteriAyrintisiAdresi, raporAdresi, urunEkraniAdresi } from "../adresler";
import {
  type CozulenRaporIstegi,
  type DonemVerisi,
  donemVerisi,
  kutuKur,
  type RaporBicimi,
  type RaporKutusu,
  raporBicimi,
  raporDonemleri,
} from "./veri";

export type Sayfa = { sayfa: number; sayfaSayisi: number; adres: (sayfa: number) => string };

const sayfala = <T>(
  satirlar: T[],
  istek: CozulenRaporIstegi,
  donem: DonemVerisi,
  boy: number,
): { satirlar: T[]; sayfa: Sayfa } => {
  const sayfaSayisi = Math.max(1, Math.ceil(satirlar.length / boy));
  const sayfa = Math.min(istek.sayfa, sayfaSayisi);
  return {
    satirlar: satirlar.slice((sayfa - 1) * boy, sayfa * boy),
    sayfa: {
      sayfa,
      sayfaSayisi,
      adres: (hedef) =>
        raporAdresi({
          donem: donem.donemDegeri,
          karsilastir: istek.karsilastir,
          rapor: istek.rapor,
          sirala: istek.sirala,
          sayfa: hedef,
        }),
    },
  };
};

// ——— Ürün raporu ———

export type UrunSatiriVerisi = {
  kimlik: string;
  ad: string;
  // Ürün ekranına bağlantı; silinmiş üründe yok.
  adres: string | null;
  silindi: boolean;
  adet: string;
  tutar: string;
  iadeAdedi: string;
  birlesimler: { kimlik: string; ad: string; adet: string; tutar: string; iadeAdedi: string }[];
};

export type UrunRaporuVerisi = DonemVerisi & {
  bos: boolean;
  sirala: "tutar" | "adet";
  siralamaAdresleri: { tutar: string; adet: string };
  satirlar: UrunSatiriVerisi[];
  sayfa: Sayfa;
};

export const secimYazisi = (secim: { secenek: string; deger: string }[]): string =>
  secim
    .map(({ secenek, deger }) => doldur(metin("yonetim.rapor.urun.secim"), { secenek, deger }))
    .join(metin("yonetim.rapor.urun.secimAyiraci"));

export const urunRaporuVerisi = async (
  vt: Veritabani,
  site: Site,
  istek: CozulenRaporIstegi,
): Promise<UrunRaporuVerisi> => {
  const b = raporBicimi(site);
  const { donem, onceki } = raporDonemleri(site, istek);
  const ortak = donemVerisi(site, istek, donem, onceki);
  const tum = await urunRaporu(site).satirlar(vt, donem, istek.sirala);
  const { panelSayfaBoyu } = await siteninMagazaAyarlari(vt, site);
  const { satirlar, sayfa } = sayfala(tum, istek, ortak, panelSayfaBoyu);
  const sirala = (kod: "tutar" | "adet") =>
    raporAdresi({
      donem: ortak.donemDegeri,
      karsilastir: istek.karsilastir,
      rapor: "urunler",
      sirala: kod,
    });
  return {
    ...ortak,
    bos: tum.length === 0,
    sirala: istek.sirala,
    siralamaAdresleri: { tutar: sirala("tutar"), adet: sirala("adet") },
    satirlar: satirlar.map((satir: UrunRaporuSatiri) => ({
      kimlik: satir.urun,
      ad: satir.ad,
      adres: satir.silindi ? null : urunEkraniAdresi(satir.urun),
      silindi: satir.silindi,
      adet: b.sayi(satir.adet),
      tutar: b.para(satir.tutar),
      iadeAdedi: b.sayi(satir.iadeAdedi),
      birlesimler: satir.birlesimler.map((birlesim) => ({
        kimlik: birlesim.birim,
        ad: secimYazisi(birlesim.secim),
        adet: b.sayi(birlesim.adet),
        tutar: b.para(birlesim.tutar),
        iadeAdedi: b.sayi(birlesim.iadeAdedi),
      })),
    })),
    sayfa,
  };
};

// ——— Müşteri raporu ———

export type MusteriSatiriVerisi = {
  kimlik: string;
  // Kişisel bilgisi silinmişse yazı "adı yok"tur.
  ad: string;
  adYok: boolean;
  // Müşteri ayrıntısına bağlantı; kapatılmış hesapta yok.
  adres: string | null;
  hesapKapali: boolean;
  siparisSayisi: string;
  tutar: string;
};

export type MusteriRaporuVerisi = DonemVerisi & {
  bos: boolean;
  kutular: RaporKutusu[];
  satirlar: MusteriSatiriVerisi[];
  sayfa: Sayfa;
};

// Müşteri başına sipariş: üyelerin siparişi bölü dönemde alışveriş yapan üye; üye yoksa yok.
const musteriBasina = (ozet: MusteriOzeti): number | null => {
  const uye = ozet.yeni + ozet.donen;
  return uye === 0 ? null : ozet.uyeSiparisi / uye;
};

export const musteriKutulari = (
  b: RaporBicimi,
  ozet: MusteriOzeti,
  onceki: MusteriOzeti | null,
): RaporKutusu[] => {
  const adet = (sayi: number) => b.sayi(sayi);
  const kutu = (
    kod: "yeni" | "donen" | "misafir" | "musteriBasina",
    al: (o: MusteriOzeti) => number | null,
    yazi: (sayi: number) => string,
    artisIyi: boolean | null,
  ) =>
    kutuKur(b, {
      kod,
      ad: metin(`yonetim.rapor.musteri.kutu.${kod}`),
      simdi: al(ozet),
      onceki: onceki === null ? undefined : al(onceki),
      yazi,
      artisIyi,
    });
  return [
    kutu("yeni", (o) => o.yeni, adet, true),
    kutu("donen", (o) => o.donen, adet, true),
    kutu(
      "misafir",
      (o) => o.misafirSiparisi,
      (sayi) => doldur(metin("yonetim.rapor.musteri.siparis"), { sayi: adet(sayi) }),
      null,
    ),
    kutu(
      "musteriBasina",
      musteriBasina,
      (sayi) => doldur(metin("yonetim.rapor.musteri.siparis"), { sayi: b.sayi(sayi, 1) }),
      null,
    ),
  ];
};

export const musteriSatiri = (b: RaporBicimi, satir: MusteriRaporuSatiri): MusteriSatiriVerisi => ({
  kimlik: satir.musteri,
  ad: satir.ad ?? metin("yonetim.rapor.musteri.adYok"),
  adYok: satir.ad === null,
  adres: satir.hesapKapali ? null : musteriAyrintisiAdresi(satir.musteri),
  hesapKapali: satir.hesapKapali,
  siparisSayisi: b.sayi(satir.siparisSayisi),
  tutar: b.para(satir.tutar),
});

export const musteriRaporuVerisi = async (
  vt: Veritabani,
  site: Site,
  istek: CozulenRaporIstegi,
): Promise<MusteriRaporuVerisi> => {
  const b = raporBicimi(site);
  const { donem, onceki } = raporDonemleri(site, istek);
  const ortak = donemVerisi(site, istek, donem, onceki);
  const servis = musteriRaporu(site);
  const [ozet, oncekiOzet, tum, ayarlar] = await Promise.all([
    servis.ozet(vt, donem),
    onceki === null ? Promise.resolve(null) : servis.ozet(vt, onceki),
    servis.enCokAlanlar(vt, donem),
    siteninMagazaAyarlari(vt, site),
  ]);
  const { satirlar, sayfa } = sayfala(tum, istek, ortak, ayarlar.panelSayfaBoyu);
  return {
    ...ortak,
    bos: ozet.uyeSiparisi === 0 && ozet.misafirSiparisi === 0,
    kutular: musteriKutulari(b, ozet, oncekiOzet),
    satirlar: satirlar.map((satir) => musteriSatiri(b, satir)),
    sayfa,
  };
};

// ——— Kupon raporu ———

export type KuponSatiriVerisi = {
  kod: string;
  // Kuponun sayfasına bağlantı; kullanımı bulunmayan siparişin kodunda yok.
  adres: string | null;
  kullanim: string;
  indirim: string;
  satis: string;
  iadeSonrasi: string;
};

export type KuponRaporuVerisi = DonemVerisi & {
  bos: boolean;
  kutular: RaporKutusu[];
  satirlar: KuponSatiriVerisi[];
  sayfa: Sayfa;
};

export const kuponKutulari = (
  b: RaporBicimi,
  ozet: KuponOzeti,
  onceki: KuponOzeti | null,
): RaporKutusu[] => {
  const para = (sayi: number) => b.para(sayi);
  const oncekiOlarak = (al: (o: KuponOzeti) => number) =>
    onceki === null ? undefined : al(onceki);
  return [
    kutuKur(b, {
      kod: "kuponluSiparis",
      ad: metin("yonetim.rapor.kupon.kutu.kuponluSiparis"),
      simdi: ozet.kuponluSiparis,
      onceki: oncekiOlarak((o) => o.kuponluSiparis),
      yazi: (sayi) => b.sayi(sayi),
      artisIyi: null,
      alt:
        ozet.butunSiparis === 0
          ? null
          : doldur(metin("yonetim.rapor.kupon.pay"), {
              butun: b.sayi(ozet.butunSiparis),
              yuzde: b.yuzde(Math.round((ozet.kuponluSiparis / ozet.butunSiparis) * 100)),
            }),
    }),
    kutuKur(b, {
      kod: "indirim",
      ad: metin("yonetim.rapor.kupon.kutu.indirim"),
      simdi: ozet.indirim,
      onceki: oncekiOlarak((o) => o.indirim),
      yazi: para,
      artisIyi: null,
    }),
    kutuKur(b, {
      kod: "satis",
      ad: metin("yonetim.rapor.kupon.kutu.satis"),
      simdi: ozet.satis,
      onceki: oncekiOlarak((o) => o.satis),
      yazi: para,
      artisIyi: true,
      alt: metin("yonetim.rapor.kupon.indirimSonrasi"),
    }),
    kutuKur(b, {
      kod: "iadeSonrasi",
      ad: metin("yonetim.rapor.kupon.kutu.iadeSonrasi"),
      simdi: ozet.iadeSonrasi,
      onceki: oncekiOlarak((o) => o.iadeSonrasi),
      yazi: para,
      artisIyi: true,
    }),
  ];
};

export const kuponSatiri = (b: RaporBicimi, satir: KuponRaporuSatiri): KuponSatiriVerisi => ({
  kod: satir.kod,
  adres: satir.kupon === null ? null : kuponAdresi(satir.kupon),
  kullanim: b.sayi(satir.kullanim),
  indirim: b.para(satir.indirim),
  satis: b.para(satir.satis),
  iadeSonrasi: b.para(satir.iadeSonrasi),
});

export const kuponRaporuVerisi = async (
  vt: Veritabani,
  site: Site,
  istek: CozulenRaporIstegi,
): Promise<KuponRaporuVerisi> => {
  const b = raporBicimi(site);
  const { donem, onceki } = raporDonemleri(site, istek);
  const ortak = donemVerisi(site, istek, donem, onceki);
  const servis = kuponRaporu(site);
  const [ozet, oncekiOzet, tum, ayarlar] = await Promise.all([
    servis.ozet(vt, donem),
    onceki === null ? Promise.resolve(null) : servis.ozet(vt, onceki),
    servis.satirlar(vt, donem),
    siteninMagazaAyarlari(vt, site),
  ]);
  const { satirlar, sayfa } = sayfala(tum, istek, ortak, ayarlar.panelSayfaBoyu);
  return {
    ...ortak,
    bos: ozet.kuponluSiparis === 0,
    kutular: kuponKutulari(b, ozet, oncekiOzet),
    satirlar: satirlar.map((satir) => kuponSatiri(b, satir)),
    sayfa,
  };
};
