// "Excel ile içe ve dışa aktar" ekranının verisi (kart 0315), sunucuda: yöneticinin son dışa aktarması ve son içe
// aktarması; sayılar, zamanlar, boyutlar ve hata metinleri sitenin biçimiyle ve metinleriyle burada yazılır. Ekran iş
// sürerken sayfayı yeniler, veri yeniden kurulur.
import { calisanSite } from "../../../ayar-semasi/calisan-site";
import { excelAyari } from "../../../kayitlar/eklentiler";
import { doldur } from "../../../metinler/doldur";
import type { MetinAnahtari } from "../../../metinler/metin";
import { metin, siteninBicimleyicisi } from "../../../metinler/site-metni";
import { fiyatHataMetinleri } from "../../../moduller/fiyat/semalar";
import { urunHataMetinleri } from "../../../moduller/urun/semalar";
import { siteninVeritabani } from "../../../veritabani/baglanti";
import { yoneticiUcu } from "../../../yonetim-paneli/panel-istegi";
import { sutunBasligi } from "../dosya";
import { calisanExcelServisi } from "../isler";
import type { OnizlemeSatiri } from "../servis";
import { fiyatSutunlari, type Sutun, sutunlar } from "../sutunlar";

export type ExcelHataSatiri = { satir: string; ad: string; sorun: string };
export type ExcelDegisiklikSatiri = { ad: string; alan: string; simdi: string; yeni: string };

export type ExcelEkraniVerisi = {
  sutunYazisi: string;
  // Ürünler listesinin süzgeçleri (adresin "liste" parametresi); yoksa yalnız "Bütün ürünler".
  listeSorgusu: string | null;
  disaAktarma: {
    kimlik: string;
    durum: "hazirlaniyor" | "hazir" | "hatali";
    yazi: string;
    indirmeAdresi: string | null;
  } | null;
  iceAktarabilir: boolean;
  sinirYazisi: string;
  enCokBayt: number;
  iceAktarma: {
    kimlik: string;
    durum: "denetleniyor" | "onizleme" | "uygulaniyor" | "bitti" | "vazgecildi" | "okunamadi";
    dosyaAdi: string;
    dosyaYazisi: string;
    okunamadi?: string;
    sayilar: { degistir: string; ekle: string; ayni: string; hatali: string };
    hataliSayisi: number;
    yazilacakSayisi: number;
    uygulaYazisi: string;
    hatalilar: ExcelHataSatiri[];
    hatalilarFazla?: string;
    degisecekler: ExcelDegisiklikSatiri[];
    degiseceklerFazla?: string;
    eklenecekler: string[];
    ilerleme: { toplam: number; uygulanan: number; yazi: string };
    sonuc: { degisti: string; eklendi: string; uygulanamadi: string };
    uygulanamayanlar: ExcelHataSatiri[];
  } | null;
};

const kendiHatalari = new Set<string>(
  Object.keys(
    // tr.json'daki eklentinin hata metinleri: anahtar listesi metinlerin kendisinden.
    {
      "ad-gerekli": 1,
      "barkod-gecersiz": 1,
      "birlesim-tekrar": 1,
      bosaltilamaz: 1,
      "durum-yok": 1,
      "etiket-yok": 1,
      "fiyat-yetkisi": 1,
      "indirim-sirasi": 1,
      "kategori-yok": 1,
      "marka-yok": 1,
      "ortak-celisiyor": 1,
      "ozellik-deger-gecersiz": 1,
      "ozellik-okunamadi": 1,
      "ozellik-tekrar": 1,
      "ozellik-yok": 1,
      "satis-fiyati-gerekli": 1,
      "secenek-gerekli": 1,
      "secenekler-okunamadi": 1,
      "secenekler-uyusmuyor": 1,
      "secenek-tekrar": 1,
      "yeni-secenek": 1,
      "sitede-degisti": 1,
      "stok-kodu-kullaniliyor": 1,
      "stok-kodu-tekrar": 1,
      "stok-okunamadi": 1,
      "stok-yetkisi": 1,
      "tutar-okunamadi": 1,
      "urun-kodu-bicimi": 1,
      "zamanlanmis-dosyadan-secilmez": 1,
      "zaman-okunamadi": 1,
    },
  ),
);

// Bir hatanın metni: önce eklentinin kendi metni, sonra ürün ve fiyat servislerinin metinleri, yoksa genel metin.
export const excelHataMetni = (hata: { kod: string; alan?: string; deger?: string }): string => {
  const anahtar: MetinAnahtari = kendiHatalari.has(hata.kod)
    ? (`eklenti.excel.hata.${hata.kod}` as MetinAnahtari)
    : ((urunHataMetinleri as Record<string, MetinAnahtari>)[hata.kod] ??
      (fiyatHataMetinleri as Record<string, MetinAnahtari>)[hata.kod] ??
      "eklenti.excel.hata.genel");
  const yazi = doldur(metin(anahtar), { deger: hata.deger ?? "" });
  return hata.alan !== undefined && (sutunlar as readonly string[]).includes(hata.alan)
    ? `${sutunBasligi(hata.alan as Sutun)}: ${yazi}`
    : yazi;
};

export const excelEkraniVerisi = async (girdi: {
  yonetici: string;
  listeSorgusu: string | null;
  fiyatGorur: boolean;
  stokGorur: boolean;
  iceAktarabilir: boolean;
}): Promise<ExcelEkraniVerisi> => {
  const site = calisanSite();
  const vt = siteninVeritabani();
  const b = siteninBicimleyicisi(site.ayarlar);
  const servis = calisanExcelServisi();
  const [disa, ice] = await Promise.all([
    servis.disaAktarmaDurumu(vt, girdi.yonetici),
    girdi.iceAktarabilir ? servis.iceAktarmaDurumu(vt, girdi.yonetici) : Promise.resolve(null),
  ]);
  const gorunenSutunlar = sutunlar.filter(
    (s) =>
      (girdi.fiyatGorur || !(fiyatSutunlari as readonly Sutun[]).includes(s)) &&
      (girdi.stokGorur || s !== "stok"),
  );
  const hataSatiri = (
    s: OnizlemeSatiri,
    hatalar: { kod: string; alan?: string; deger?: string }[],
  ) => ({
    satir: b.sayi(s.no),
    ad: s.ad,
    sorun: hatalar.map(excelHataMetni).join(" "),
  });
  const fazla = (toplam: number, gosterilen: number) =>
    toplam > gosterilen
      ? doldur(metin("eklenti.excel.ekran.dahaFazla"), {
          sayi: b.sayi(toplam - gosterilen),
          sinir: b.sayi(excelAyari.onizlemeSatiri),
        })
      : undefined;
  const okunamadiYazisi = (neden: string, ayrinti?: string) => {
    const anahtar = `eklenti.excel.okunamadi.${neden}` as MetinAnahtari;
    return doldur(metin(anahtar), {
      sinir: ayrinti === undefined ? "" : b.sayi(Number(ayrinti)),
      sutun: ayrinti ?? "",
    });
  };
  return {
    sutunYazisi: doldur(metin("eklenti.excel.ekran.sutunlar"), {
      sutunlar: gorunenSutunlar.map(sutunBasligi).join(" · "),
    }),
    listeSorgusu: girdi.listeSorgusu,
    disaAktarma:
      disa === null
        ? null
        : {
            kimlik: disa.kimlik,
            durum: disa.durum,
            yazi:
              disa.durum === "hazir"
                ? doldur(metin("eklenti.excel.ekran.hazir"), {
                    urun: b.sayi(disa.urunSayisi),
                    satir: b.sayi(disa.satirSayisi),
                    zaman: b.tarihSaat(disa.olusturma),
                  })
                : metin(
                    disa.durum === "hatali"
                      ? "eklenti.excel.ekran.hazirlanamadi"
                      : "eklenti.excel.ekran.hazirlaniyor",
                  ),
            indirmeAdresi:
              disa.durum === "hazir"
                ? `${yoneticiUcu("urunler-excel-indir")}?${new URLSearchParams({ kimlik: disa.kimlik })}`
                : null,
          },
    iceAktarabilir: girdi.iceAktarabilir,
    sinirYazisi: doldur(metin("eklenti.excel.ekran.sinirlar"), {
      satir: b.sayi(site.ayarlar.excelSatirSiniri),
      boyut: b.dosyaBoyutu(excelAyari.enCokBayt),
    }),
    enCokBayt: excelAyari.enCokBayt,
    iceAktarma:
      ice === null
        ? null
        : {
            kimlik: ice.kimlik,
            durum: ice.durum,
            dosyaAdi: ice.dosyaAdi,
            dosyaYazisi: doldur(metin("eklenti.excel.ekran.dosyaSatiri"), {
              satir: b.sayi(ice.satirSayisi),
              boyut: b.dosyaBoyutu(ice.dosyaBoyutu),
            }),
            ...(ice.neden === undefined
              ? {}
              : { okunamadi: okunamadiYazisi(ice.neden, ice.nedenAyrintisi) }),
            sayilar: {
              degistir: b.sayi(ice.sayilar.degistir),
              ekle: b.sayi(ice.sayilar.ekle),
              ayni: b.sayi(ice.sayilar.ayni),
              hatali: b.sayi(ice.sayilar.hatali),
            },
            hataliSayisi: ice.sayilar.hatali,
            yazilacakSayisi: ice.sayilar.degistir + ice.sayilar.ekle,
            // Uygulanamayan önizlemede sayı yazılmaz ("0 satırı uygula" yerine "Uygula").
            uygulaYazisi:
              ice.sayilar.hatali > 0 || ice.sayilar.degistir + ice.sayilar.ekle === 0
                ? metin("eklenti.excel.ekran.uygulaSade")
                : doldur(metin("eklenti.excel.ekran.uygula"), {
                    sayi: b.sayi(ice.sayilar.degistir + ice.sayilar.ekle),
                  }),
            hatalilar: ice.hatalilar.map((s) => hataSatiri(s, s.hatalar)),
            ...(fazla(ice.sayilar.hatali, ice.hatalilar.length) === undefined
              ? {}
              : { hatalilarFazla: fazla(ice.sayilar.hatali, ice.hatalilar.length) as string }),
            degisecekler: ice.degisecekler.flatMap((s) =>
              s.degisiklikler.map((d) => ({
                ad: s.ad,
                alan: sutunBasligi(d.alan),
                simdi: d.simdi,
                yeni: d.yeni,
              })),
            ),
            ...(fazla(ice.sayilar.degistir, ice.degisecekler.length) === undefined
              ? {}
              : {
                  degiseceklerFazla: fazla(ice.sayilar.degistir, ice.degisecekler.length) as string,
                }),
            eklenecekler: ice.eklenecekler.map((s) => s.ad),
            ilerleme: {
              toplam: ice.uygulama.toplam,
              uygulanan: ice.uygulama.uygulanan + ice.uygulama.uygulanamayan,
              yazi: doldur(metin("eklenti.excel.ekran.ilerleme"), {
                toplam: b.sayi(ice.uygulama.toplam),
                uygulanan: b.sayi(ice.uygulama.uygulanan + ice.uygulama.uygulanamayan),
              }),
            },
            sonuc: {
              degisti: b.sayi(ice.uygulama.degisen),
              eklendi: b.sayi(ice.uygulama.eklenen),
              uygulanamadi: b.sayi(ice.uygulama.uygulanamayan),
            },
            uygulanamayanlar: ice.uygulanamayanlar.map((s) =>
              hataSatiri(s, [{ kod: s.uygulamaHatasi ?? "genel" }]),
            ),
          },
  };
};
