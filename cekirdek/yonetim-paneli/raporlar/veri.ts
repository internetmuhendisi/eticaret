// Raporlar ekranının verisi (kart 0317, karar 0195), sunucuda. Sayfa ve CSV ucu aynı istek çözümünü kullanır:
// adresteki dönem (geçersizse sitenin varsayılan dönemi) ve karşılaştırma (varsayılan açık, "karsilastir=0" kapatır).
// Tutar, gün ve yüzde sitenin biçimiyle burada yazılır; ekran biçimlemez.
import type { Site } from "../../ayar-semasi/site-klasoru";
import type { RaporHazirDonemi } from "../../kayitlar/rapor";
import { gununBasi, takvimGunu, takvimGunuYazisi } from "../../metinler/bicimleyici";
import { doldur } from "../../metinler/doldur";
import { metin, siteninBicimleyicisi } from "../../metinler/site-metni";
import { siteninMagazaAyarlari } from "../../moduller/magaza-ayarlari/servis";
import {
  donemGunleri,
  type RaporDonemDegeri,
  raporDonemDegeri,
  raporDonemDegeriniCoz,
} from "../../moduller/rapor/donem";
import { type SatisOzeti, type SatisRaporu, satisRaporu } from "../../moduller/rapor/satis";
import type { Veritabani } from "../../veritabani/baglanti";
import { raporAdresi } from "../adresler";
import { yoneticiUcu } from "../panel-istegi";

export type RaporIstegi = { donem?: string | undefined; karsilastir?: string | undefined };

export type CozulenRaporIstegi = {
  deger: RaporDonemDegeri;
  // Sitenin varsayılan dönemi (raporVarsayilanDonem): adresteki dönem geçersizse ya da yoksa o kullanılır.
  varsayilan: RaporHazirDonemi;
  karsilastir: boolean;
};

export const raporIsteginiCoz = async (
  vt: Veritabani,
  site: Site,
  istek: RaporIstegi,
): Promise<CozulenRaporIstegi> => {
  const okunan = istek.donem === undefined ? undefined : raporDonemDegeriniCoz(istek.donem);
  const varsayilan = (await siteninMagazaAyarlari(vt, site)).raporVarsayilanDonem;
  return {
    deger: okunan ?? { tur: "hazir", kod: varsayilan },
    varsayilan,
    karsilastir: istek.karsilastir !== "0",
  };
};

// İsteğin raporu: dönemin günleri sitenin saat dilimindeki bugüne göre.
export const raporuOku = async (
  vt: Veritabani,
  site: Site,
  istek: CozulenRaporIstegi,
): Promise<SatisRaporu> => {
  const bugun = takvimGunu(new Date(), site.ayarlar.saatDilimi);
  return satisRaporu(site).rapor(vt, donemGunleri(istek.deger, bugun), istek.karsilastir);
};

export type SatisKutusu = {
  kod: "satis" | "siparisSayisi" | "ortalamaSepet" | "iade";
  deger: string;
  // "▲ %12 · önceki 37.784,30 ₺"; karşılaştırma yoksa yok.
  fark: string | null;
  yon: "arti" | "eksi" | "esit" | null;
  // Değişim mağaza için iyi mi (iadede azalış iyidir): fark yeşil ya da kırmızı yazılır, anlamı okla ve yazıyla da
  // verilir. Değişmediyse ya da karşılaştırma yoksa yok.
  iyi: boolean | null;
  alt: string | null;
};

export type SatisRaporuVerisi = {
  // Dönem düğmesinin yazısı: "Son 30 gün: 29 Ekim – 27 Kasım 2026" ya da özel aralıkta yalnız günler.
  dugmeYazisi: string;
  // Boş hâlin sonraki adımı: varsayılan döneme dönüş; varsayılan dönemdeyken yok.
  varsayilanaDonus: { adres: string; yazi: string } | null;
  // Adreste yazılacak değer ve seçim penceresinin başlangıcı.
  donemDegeri: string;
  hazirKod: string | null;
  ozelBaslangic: string;
  ozelBitis: string;
  karsilastir: boolean;
  donemYazisi: string;
  oncekiYazisi: string | null;
  bos: boolean;
  kutular: SatisKutusu[];
  // Özet ve vergi tablosunun satırları: satış, kupon indirimi, iadeler, net satış, oran oran vergi.
  ozetSatirlari: { ad: string; deger: string; vurgu: boolean }[];
  seri: {
    baslik: string;
    noktalar: { ad: string; deger: string; oran: number }[];
  };
  csvAdresi: string;
};

type Bicim = ReturnType<typeof siteninBicimleyicisi> & {
  uzunGun: (gun: string) => string;
  kisaGun: (gun: string) => string;
};

// Günlerin kısa yazılışı (taslak: "23 Eki – 21 Kas 2026", karşılaştırmada yılsız). Tek gün ve iki yıla yayılan
// aralık uzun yazılır.
const aralikYazisi = (
  b: Bicim,
  saatDilimi: string,
  { baslangic, bitis }: { baslangic: string; bitis: string },
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

// Önceki döneme göre değişim: yüzde (önceki sıfırken yok) ve önceki değer.
const farkYazisi = (
  b: Bicim,
  simdi: number,
  onceki: number,
  yazi: (sayi: number) => string,
): { fark: string; yon: NonNullable<SatisKutusu["yon"]> } => {
  const yon = simdi > onceki ? "arti" : simdi < onceki ? "eksi" : "esit";
  const oncekiYazi = doldur(metin("yonetim.rapor.onceki"), { deger: yazi(onceki) });
  if (onceki === 0) return { fark: oncekiYazi, yon };
  const yuzde = b.yuzde(Math.abs(Math.round(((simdi - onceki) / onceki) * 1000) / 10));
  return {
    fark: doldur(metin(`yonetim.rapor.fark.${yon}`), { yuzde, onceki: oncekiYazi }),
    yon,
  };
};

export const satisRaporuVerisi = (
  site: Site,
  istek: CozulenRaporIstegi,
  rapor: SatisRaporu,
): SatisRaporuVerisi => {
  const b: Bicim = {
    ...siteninBicimleyicisi(site.ayarlar),
    uzunGun: (gun) => takvimGunuYazisi(site.ayarlar.dil, gun, "uzun"),
    kisaGun: (gun) => takvimGunuYazisi(site.ayarlar.dil, gun, "kisa"),
  };
  const { ozet, onceki } = rapor;
  const para = (sayi: number) => b.para(sayi);
  const adet = (sayi: number) => b.sayi(sayi);
  const kutu = (
    kod: SatisKutusu["kod"],
    al: (o: SatisOzeti) => number | null,
    yazi: (sayi: number) => string,
    alt: string | null = null,
  ): SatisKutusu => {
    const simdi = al(ozet);
    const deger = simdi === null ? metin("yonetim.rapor.yok") : yazi(simdi);
    const oncekiSayi = onceki === null ? null : al(onceki.ozet);
    if (simdi === null || oncekiSayi === null) {
      return { kod, deger, fark: null, yon: null, iyi: null, alt };
    }
    const fark = farkYazisi(b, simdi, oncekiSayi, yazi);
    const iyi = fark.yon === "esit" ? null : (fark.yon === "arti") !== (kod === "iade");
    return { kod, deger, ...fark, iyi, alt };
  };
  const iade =
    ozet.iade > 0 ? doldur(metin("yonetim.rapor.eksi"), { tutar: para(ozet.iade) }) : para(0);
  const enCok = Math.max(0, ...rapor.seri.noktalar.map((nokta) => nokta.satis));
  const sorgu = new URLSearchParams({ donem: raporDonemDegeri(istek.deger) });
  if (!istek.karsilastir) sorgu.set("karsilastir", "0");
  const { saatDilimi } = site.ayarlar;
  const donemYazisi = aralikYazisi(b, saatDilimi, rapor.donem, true);
  const varsayilandaMi = istek.deger.tur === "hazir" && istek.deger.kod === istek.varsayilan;
  return {
    dugmeYazisi:
      istek.deger.tur === "hazir"
        ? doldur(metin("yonetim.rapor.dugme"), {
            donem: metin(`yonetim.rapor.hazir.${istek.deger.kod}`),
            aralik: donemYazisi,
          })
        : donemYazisi,
    varsayilanaDonus: varsayilandaMi
      ? null
      : {
          adres: raporAdresi(istek.varsayilan, istek.karsilastir),
          yazi: doldur(metin("yonetim.rapor.bos.donus"), {
            donem: metin(`yonetim.rapor.hazir.${istek.varsayilan}`),
          }),
        },
    donemDegeri: raporDonemDegeri(istek.deger),
    hazirKod: istek.deger.tur === "hazir" ? istek.deger.kod : null,
    ozelBaslangic: rapor.donem.baslangic,
    ozelBitis: rapor.donem.bitis,
    karsilastir: istek.karsilastir,
    donemYazisi,
    oncekiYazisi:
      onceki === null
        ? null
        : doldur(metin("yonetim.rapor.karsilastirma"), {
            aralik: aralikYazisi(b, saatDilimi, onceki.donem, false),
          }),
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
    csvAdresi: `${yoneticiUcu("rapor-satis-csv")}?${sorgu.toString()}`,
  };
};
