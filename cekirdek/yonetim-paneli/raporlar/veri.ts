// Raporlar ekranının verisi (kart 0317, 0318; karar 0195, 0196), sunucuda. Sayfa ve CSV ucu aynı istek çözümünü
// kullanır: adresteki rapor sekmesi (satış varsayılan), dönem (geçersizse sitenin varsayılan dönemi), karşılaştırma
// (varsayılan açık, "karsilastir=0" kapatır), ürün raporunun sırası ve sayfa. Tutar, gün ve yüzde sitenin biçimiyle
// burada yazılır; ekran biçimlemez. Dönemin ve sayı kutularının ortak parçaları burada, ürün, müşteri ve kupon
// raporlarınınki diger-veri.ts'tedir.
import type { Site } from "../../ayar-semasi/site-klasoru";
import { type RaporHazirDonemi, type RaporTuru, raporTurleri } from "../../kayitlar/rapor";
import { gununBasi, takvimGunu, takvimGunuYazisi } from "../../metinler/bicimleyici";
import { doldur } from "../../metinler/doldur";
import { metin, siteninBicimleyicisi } from "../../metinler/site-metni";
import { siteninMagazaAyarlari } from "../../moduller/magaza-ayarlari/servis";
import {
  donemGunleri,
  type GunAraligi,
  karsilastirmaDonemi,
  type RaporDonemDegeri,
  raporDonemDegeri,
  raporDonemDegeriniCoz,
} from "../../moduller/rapor/donem";
import { type SatisOzeti, type SatisRaporu, satisRaporu } from "../../moduller/rapor/satis";
import { type UrunRaporuSiralamasi, urunRaporuSiralamalari } from "../../moduller/rapor/urun";
import type { Veritabani } from "../../veritabani/baglanti";
import { raporAdresi } from "../adresler";
import { yoneticiUcu } from "../panel-istegi";

export type RaporIstegi = {
  rapor?: string | undefined;
  donem?: string | undefined;
  karsilastir?: string | undefined;
  sirala?: string | undefined;
  sayfa?: string | undefined;
};

export type CozulenRaporIstegi = {
  rapor: RaporTuru;
  deger: RaporDonemDegeri;
  // Sitenin varsayılan dönemi (raporVarsayilanDonem): adresteki dönem geçersizse ya da yoksa o kullanılır.
  varsayilan: RaporHazirDonemi;
  karsilastir: boolean;
  sirala: UrunRaporuSiralamasi;
  // Tablonun sayfası (ürün, müşteri ve kupon raporu); sınır dışı sayfa son sayfaya çekilir.
  sayfa: number;
};

export const raporIsteginiCoz = async (
  vt: Veritabani,
  site: Site,
  istek: RaporIstegi,
): Promise<CozulenRaporIstegi> => {
  const okunan = istek.donem === undefined ? undefined : raporDonemDegeriniCoz(istek.donem);
  const varsayilan = (await siteninMagazaAyarlari(vt, site)).raporVarsayilanDonem;
  const sayfa = /^[1-9]\d{0,5}$/.test(istek.sayfa ?? "") ? Number(istek.sayfa) : 1;
  return {
    rapor: (raporTurleri as readonly string[]).includes(istek.rapor ?? "")
      ? (istek.rapor as RaporTuru)
      : "satis",
    deger: okunan ?? { tur: "hazir", kod: varsayilan },
    varsayilan,
    karsilastir: istek.karsilastir !== "0",
    sirala: (urunRaporuSiralamalari as readonly string[]).includes(istek.sirala ?? "")
      ? (istek.sirala as UrunRaporuSiralamasi)
      : "tutar",
    sayfa,
  };
};

// İsteğin dönemi ve karşılaştırılan dönemi: günler sitenin saat dilimindeki bugüne göre.
export const raporDonemleri = (
  site: Site,
  istek: CozulenRaporIstegi,
): { donem: GunAraligi; onceki: GunAraligi | null } => {
  const bugun = takvimGunu(new Date(), site.ayarlar.saatDilimi);
  const donem = donemGunleri(istek.deger, bugun);
  return { donem, onceki: istek.karsilastir ? karsilastirmaDonemi(istek.deger, donem) : null };
};

// Satış raporu.
export const raporuOku = (
  vt: Veritabani,
  site: Site,
  istek: CozulenRaporIstegi,
): Promise<SatisRaporu> => {
  const { donem, onceki } = raporDonemleri(site, istek);
  return satisRaporu(site).rapor(vt, donem, onceki);
};

export type RaporKutusu = {
  kod: string;
  ad: string;
  deger: string;
  // Değişim ve önceki değer ("▲ yüzde 12 artış · önceki …"); karşılaştırma yoksa yok.
  fark: string | null;
  yon: "arti" | "eksi" | "esit" | null;
  // Değişim mağaza için iyi mi (iadede azalış iyidir): fark yeşil ya da kırmızı yazılır, anlamı okla ve yazıyla da
  // verilir. Değişmediyse, karşılaştırma yoksa ya da değişimin iyisi kötüsü yoksa yok.
  iyi: boolean | null;
  alt: string | null;
};

// Satış kutularının eski adı (kart 0317).
export type SatisKutusu = RaporKutusu;

// Bütün raporların dönem kısmı: düğme, karşılaştırma yazısı, boş hâlin bağlantısı, seçim penceresinin başlangıcı.
export type DonemVerisi = {
  rapor: RaporTuru;
  // Dönem düğmesinin yazısı: "Son 30 gün: 29 Eki – 27 Kas 2026" ya da özel aralıkta yalnız günler.
  dugmeYazisi: string;
  // Boş hâlin sonraki adımı: varsayılan döneme dönüş; varsayılan dönemdeyken başka bir hazır dönem.
  bosDonemBaglantisi: { adres: string; yazi: string };
  donemDegeri: string;
  hazirKod: string | null;
  ozelBaslangic: string;
  ozelBitis: string;
  karsilastir: boolean;
  donemYazisi: string;
  oncekiYazisi: string | null;
  // Sekmelerin adresleri (dönem ve karşılaştırma korunur).
  sekmeler: { kod: RaporTuru; ad: string; adres: string }[];
  csvAdresi: string;
};

export type RaporBicimi = ReturnType<typeof siteninBicimleyicisi> & {
  uzunGun: (gun: string) => string;
  kisaGun: (gun: string) => string;
};

export const raporBicimi = (site: Site): RaporBicimi => ({
  ...siteninBicimleyicisi(site.ayarlar),
  uzunGun: (gun) => takvimGunuYazisi(site.ayarlar.dil, gun, "uzun"),
  kisaGun: (gun) => takvimGunuYazisi(site.ayarlar.dil, gun, "kisa"),
});

// Günlerin kısa yazılışı (taslak: "23 Eki – 21 Kas 2026", karşılaştırmada yılsız). Tek gün ve iki yıla yayılan
// aralık uzun yazılır.
export const aralikYazisi = (
  b: RaporBicimi,
  saatDilimi: string,
  { baslangic, bitis }: GunAraligi,
  yilli: boolean,
) => {
  if (baslangic === bitis) return b.uzunGun(baslangic);
  if (baslangic.slice(0, 4) !== bitis.slice(0, 4)) {
    return doldur(metin("yonetim.rapor.aralik"), {
      baslangic: b.uzunGun(baslangic),
      bitis: b.uzunGun(bitis),
    });
  }
  const aralik = doldur(metin("yonetim.rapor.aralik"), {
    baslangic: b.kisaGun(baslangic),
    bitis: b.kisaGun(bitis),
  });
  return yilli
    ? doldur(metin("yonetim.rapor.aralikYili"), {
        aralik,
        yil: b.yil(gununBasi(bitis, saatDilimi)),
      })
    : aralik;
};

// Önceki döneme göre değişim: tam sayı yüzde (önceki sıfırken yok, yüzde birin altındaki değişim "yüzde birden az")
// ve önceki değer.
const farkYazisi = (
  b: RaporBicimi,
  simdi: number,
  onceki: number,
  yazi: (sayi: number) => string,
): { fark: string; yon: NonNullable<RaporKutusu["yon"]> } => {
  const yon = simdi > onceki ? "arti" : simdi < onceki ? "eksi" : "esit";
  const oncekiYazi = doldur(metin("yonetim.rapor.onceki"), { deger: yazi(onceki) });
  if (onceki === 0) return { fark: oncekiYazi, yon };
  const tam = Math.round((Math.abs(simdi - onceki) / onceki) * 100);
  const yuzde =
    tam === 0 && yon !== "esit"
      ? doldur(metin("yonetim.rapor.birdenAz"), { yuzde: b.yuzde(1) })
      : b.yuzde(tam);
  return {
    fark: doldur(metin(`yonetim.rapor.fark.${yon}`), { yuzde, onceki: oncekiYazi }),
    yon,
  };
};

// Sayı kutusu: bu dönemin değeri ve (karşılaştırma varsa) önceki dönemle farkı. artisIyi: artış mağaza için iyi mi
// (iadede kötü); null ise farkın rengi yoktur. Bir dönemde değer yoksa yalnız önceki değer söylenir.
export const kutuKur = (
  b: RaporBicimi,
  girdi: {
    kod: string;
    ad: string;
    simdi: number | null;
    onceki: number | null | undefined;
    yazi: (sayi: number) => string;
    artisIyi: boolean | null;
    alt?: string | null;
  },
): RaporKutusu => {
  const { kod, ad, simdi, onceki, yazi, artisIyi } = girdi;
  const alt = girdi.alt ?? null;
  const deger = simdi === null ? metin("yonetim.rapor.yok") : yazi(simdi);
  if (onceki === undefined) return { kod, ad, deger, fark: null, yon: null, iyi: null, alt };
  if (simdi === null || onceki === null) {
    const fark =
      onceki === null
        ? metin("yonetim.rapor.oncekiYok")
        : doldur(metin("yonetim.rapor.onceki"), { deger: yazi(onceki) });
    return { kod, ad, deger, fark, yon: null, iyi: null, alt };
  }
  const fark = farkYazisi(b, simdi, onceki, yazi);
  const iyi = fark.yon === "esit" || artisIyi === null ? null : (fark.yon === "arti") === artisIyi;
  return { kod, ad, deger, ...fark, iyi, alt };
};

export const donemVerisi = (
  site: Site,
  istek: CozulenRaporIstegi,
  donem: GunAraligi,
  onceki: GunAraligi | null,
): DonemVerisi => {
  const b = raporBicimi(site);
  const { saatDilimi } = site.ayarlar;
  const donemYazisi = aralikYazisi(b, saatDilimi, donem, true);
  const varsayilandaMi = istek.deger.tur === "hazir" && istek.deger.kod === istek.varsayilan;
  // Varsayılan dönem boşsa önerilen öteki dönem: geçen ay, varsayılan geçen aysa son 30 gün.
  const baskaDonem: RaporHazirDonemi = istek.varsayilan === "gecen-ay" ? "son-30-gun" : "gecen-ay";
  const donemDegeri = raporDonemDegeri(istek.deger);
  const adres = (ek: { donem?: string; rapor?: RaporTuru }) =>
    raporAdresi({
      donem: ek.donem ?? donemDegeri,
      karsilastir: istek.karsilastir,
      rapor: ek.rapor ?? istek.rapor,
    });
  const sorgu = new URLSearchParams({ rapor: istek.rapor, donem: donemDegeri });
  if (!istek.karsilastir) sorgu.set("karsilastir", "0");
  if (istek.rapor === "urunler" && istek.sirala !== "tutar") sorgu.set("sirala", istek.sirala);
  return {
    rapor: istek.rapor,
    dugmeYazisi:
      istek.deger.tur === "hazir"
        ? doldur(metin("yonetim.rapor.dugme"), {
            donem: metin(`yonetim.rapor.hazir.${istek.deger.kod}`),
            aralik: donemYazisi,
          })
        : donemYazisi,
    bosDonemBaglantisi: varsayilandaMi
      ? {
          adres: adres({ donem: baskaDonem }),
          yazi: doldur(metin("yonetim.rapor.bos.baska"), {
            donem: metin(`yonetim.rapor.hazir.${baskaDonem}`),
          }),
        }
      : {
          adres: adres({ donem: istek.varsayilan }),
          yazi: doldur(metin("yonetim.rapor.bos.donus"), {
            donem: metin(`yonetim.rapor.hazir.${istek.varsayilan}`),
          }),
        },
    donemDegeri,
    hazirKod: istek.deger.tur === "hazir" ? istek.deger.kod : null,
    ozelBaslangic: donem.baslangic,
    ozelBitis: donem.bitis,
    karsilastir: istek.karsilastir,
    donemYazisi,
    oncekiYazisi:
      onceki === null
        ? null
        : doldur(metin("yonetim.rapor.karsilastirma"), {
            aralik: aralikYazisi(b, saatDilimi, onceki, false),
          }),
    sekmeler: raporTurleri.map((kod) => ({
      kod,
      ad: metin(`yonetim.rapor.sekme.${kod}`),
      adres: adres({ rapor: kod }),
    })),
    csvAdresi: `${yoneticiUcu("rapor-csv")}?${sorgu.toString()}`,
  };
};

export type SatisRaporuVerisi = DonemVerisi & {
  bos: boolean;
  kutular: RaporKutusu[];
  // Özet ve vergi tablosunun satırları: satış, kupon indirimi, iadeler, net satış, oran oran vergi.
  ozetSatirlari: { ad: string; deger: string; vurgu: boolean }[];
  seri: {
    baslik: string;
    // Tablonun ilk sütununun başlığı: gün ya da hafta.
    sutun: string;
    noktalar: { ad: string; deger: string; oran: number }[];
  };
};

export const satisRaporuVerisi = (
  site: Site,
  istek: CozulenRaporIstegi,
  rapor: SatisRaporu,
): SatisRaporuVerisi => {
  const b = raporBicimi(site);
  const { ozet, onceki } = rapor;
  const para = (sayi: number) => b.para(sayi);
  const adet = (sayi: number) => b.sayi(sayi);
  const kutu = (
    kod: "satis" | "siparisSayisi" | "ortalamaSepet" | "iade",
    al: (o: SatisOzeti) => number | null,
    yazi: (sayi: number) => string,
    alt: string | null = null,
  ): RaporKutusu =>
    kutuKur(b, {
      kod,
      ad: metin(`yonetim.rapor.kutu.${kod}`),
      simdi: al(ozet),
      onceki: onceki === null ? undefined : al(onceki.ozet),
      yazi,
      artisIyi: kod !== "iade",
      alt,
    });
  const iade =
    ozet.iade > 0 ? doldur(metin("yonetim.rapor.eksi"), { tutar: para(ozet.iade) }) : para(0);
  const enCok = Math.max(0, ...rapor.seri.noktalar.map((nokta) => nokta.satis));
  return {
    ...donemVerisi(site, istek, rapor.donem, onceki?.donem ?? null),
    bos: ozet.siparisSayisi === 0 && ozet.iadeSayisi === 0,
    kutular: [
      kutu("satis", (o) => o.satis, para),
      kutu("siparisSayisi", (o) => o.siparisSayisi, adet),
      kutu("ortalamaSepet", (o) => o.ortalamaSepet, para),
      kutu(
        "iade",
        (o) => o.iade,
        para,
        doldur(metin("yonetim.rapor.iadeSayisi"), { sayi: adet(ozet.iadeSayisi) }),
      ),
    ],
    ozetSatirlari: [
      { ad: metin("yonetim.rapor.ozet.satis"), deger: para(ozet.satis), vurgu: false },
      { ad: metin("yonetim.rapor.ozet.kupon"), deger: para(ozet.kuponIndirimi), vurgu: false },
      { ad: metin("yonetim.rapor.ozet.iade"), deger: iade, vurgu: false },
      { ad: metin("yonetim.rapor.ozet.net"), deger: para(ozet.netSatis), vurgu: true },
      ...ozet.vergiler.map((satir) => ({
        ad: doldur(metin("yonetim.rapor.ozet.vergi"), {
          ad: `${satir.ad ?? metin("yonetim.rapor.csv.vergi")} ${b.yuzde(satir.oran / 10_000)}`,
          matrah: para(satir.matrah),
        }),
        deger: para(satir.vergi),
        vurgu: false,
      })),
    ],
    seri: {
      baslik: metin(`yonetim.rapor.seri.${rapor.seri.tur}`),
      sutun: metin(
        rapor.seri.tur === "gunluk" ? "yonetim.rapor.seri.donem" : "yonetim.rapor.seri.hafta",
      ),
      noktalar: rapor.seri.noktalar.map((nokta) => ({
        ad:
          nokta.baslangic === nokta.bitis
            ? b.kisaGun(nokta.baslangic)
            : doldur(metin("yonetim.rapor.aralik"), {
                baslangic: b.kisaGun(nokta.baslangic),
                bitis: b.kisaGun(nokta.bitis),
              }),
        deger: para(nokta.satis),
        oran: enCok === 0 ? 0 : nokta.satis / enCok,
      })),
    },
  };
};
