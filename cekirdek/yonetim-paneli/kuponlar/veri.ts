// Kupon ekranlarının verisi (kart 0313, karar 0188), sunucuda: listenin bir sayfası biçimlenmiş satırlarla, kuponun
// sayfası (özet ve kullanıldığı siparişler) ve formun başlangıcı. Liste ucu ve sayfa aynı işlevleri çağırır. Tutar,
// tarih ve yüzde sitenin biçimiyle yazılır; tarayıcı biçimlemez.
import { calisanSite } from "../../ayar-semasi/calisan-site";
import type { KuponDurumu, KuponKapsami, KuponTuru } from "../../kayitlar/kampanya";
import type { SiparisDurumu } from "../../kayitlar/siparis";
import { yerelZamana } from "../../metinler/bicimleyici";
import { doldur } from "../../metinler/doldur";
import { metin, siteninBicimleyicisi } from "../../metinler/site-metni";
import {
  type KuponPanelSatiri,
  kuponKullanimListesi,
  kuponPanelAyrintisi,
  kuponPanelListesi,
} from "../../moduller/kampanya/panel";
import { siteninMagazaAyarlari, siteninServisi } from "../../moduller/magaza-ayarlari/servis";
import type { FiyatGirisi } from "../../moduller/vergi/semalar";
import { siteninVeritabani } from "../../veritabani/baglanti";
import type { ListeDurumu, ListeVerisi } from "../liste/tanim";
import { kuponListesiGirdisi } from "./liste-tanimi";

export type KuponSatiri = {
  kimlik: string;
  kod: string;
  ad: string | null;
  // Yüzde, tutar (sitenin para biçimiyle) ya da ücretsiz kargo.
  indirim: string;
  // Koşullar tek satırda: en az tutar, kapsam, kişi başı sınır, indirimli ürünlerde geçmez.
  kosullar: string | null;
  gecerlilik: string;
  // "7 / 100" ya da sınırsızda "7".
  kullanim: string;
  durum: KuponDurumu;
};

type Bicim = ReturnType<typeof siteninBicimleyicisi>;

const indirimYazisi = (b: Bicim, tur: KuponTuru, deger: number): string =>
  tur === "yuzde"
    ? b.yuzde(deger)
    : tur === "tutar"
      ? b.para(deger)
      : metin("yonetim.kupon.tur.ucretsiz-kargo");

const kosulYazisi = (b: Bicim, satir: KuponPanelSatiri): string | null => {
  const parcalar = [
    satir.enAzTutar === null
      ? null
      : doldur(metin("yonetim.kupon.kosul.enAz"), { tutar: b.para(satir.enAzTutar) }),
    satir.kapsam === "hepsi"
      ? null
      : doldur(metin(`yonetim.kupon.kosul.${satir.kapsam}`), {
          sayi: b.sayi(satir.kapsamSayisi),
        }),
    satir.kisiBasiSinir === null
      ? null
      : doldur(metin("yonetim.kupon.kosul.kisiBasi"), { sayi: b.sayi(satir.kisiBasiSinir) }),
    satir.indirimdeGecmez ? metin("yonetim.kupon.kosul.indirimdeGecmez") : null,
  ].filter((parca): parca is string => parca !== null);
  return parcalar.length === 0 ? null : parcalar.join(metin("yonetim.kupon.kosul.ayirici"));
};

const gecerlilikYazisi = (b: Bicim, baslangic: Date | null, bitis: Date | null): string => {
  if (baslangic !== null && bitis !== null) {
    return doldur(metin("yonetim.kupon.gecerlilik.aralik"), {
      baslangic: b.uzunTarih(baslangic),
      bitis: b.uzunTarih(bitis),
    });
  }
  if (baslangic !== null) {
    return doldur(metin("yonetim.kupon.gecerlilik.baslangic"), {
      baslangic: b.uzunTarih(baslangic),
    });
  }
  if (bitis !== null) {
    return doldur(metin("yonetim.kupon.gecerlilik.bitis"), { bitis: b.uzunTarih(bitis) });
  }
  return metin("yonetim.kupon.gecerlilik.suresiz");
};

const kullanimYazisi = (b: Bicim, kullanim: number, sinir: number | null): string =>
  sinir === null
    ? b.sayi(kullanim)
    : doldur(metin("yonetim.kupon.kullanimSinirli"), {
        kullanim: b.sayi(kullanim),
        sinir: b.sayi(sinir),
      });

const satiriBicimle = (b: Bicim, satir: KuponPanelSatiri): KuponSatiri => ({
  kimlik: satir.kimlik,
  kod: satir.kod,
  ad: satir.ad,
  indirim: indirimYazisi(b, satir.tur, satir.deger),
  kosullar: kosulYazisi(b, satir),
  gecerlilik: gecerlilikYazisi(b, satir.baslangic, satir.bitis),
  kullanim: kullanimYazisi(b, satir.kullanim, satir.toplamSinir),
  durum: satir.durum,
});

export const kuponListesiVerisi = async (durum: ListeDurumu): Promise<ListeVerisi<KuponSatiri>> => {
  const site = calisanSite();
  const vt = siteninVeritabani();
  const b = siteninBicimleyicisi(site.ayarlar);
  const { panelSayfaBoyu } = await siteninMagazaAyarlari(vt, site);
  const liste = await kuponPanelListesi(vt, kuponListesiGirdisi(durum, panelSayfaBoyu), {
    dil: site.ayarlar.dil,
  });
  return {
    satirlar: liste.satirlar.map((satir) => satiriBicimle(b, satir)),
    toplam: liste.toplam,
    sayfa: liste.sayfa,
    sayfaSayisi: liste.sayfaSayisi,
    sayfaBoyu: liste.sayfaBoyu,
    sekmeSayilari: {
      ...liste.durumSayilari,
      "": Object.values(liste.durumSayilari).reduce((a, sayi) => a + sayi, 0),
    },
  };
};

// Formun alanları formun yazılışıyla (metin): tutar sitenin para biçimiyle simgesiz, zaman sitenin saat diliminde
// yerel zaman, boş alan "yok".
export type KuponFormu = {
  kod: string;
  ad: string;
  tur: KuponTuru;
  deger: string;
  enAzTutar: string;
  kapsam: KuponKapsami;
  kapsamKayitlari: { kimlik: string; ad: string }[];
  baslangic: string;
  bitis: string;
  toplamSinir: string;
  kisiBasiSinir: string;
  indirimdeGecmez: boolean;
  acik: boolean;
};

export const bosKuponFormu: KuponFormu = {
  kod: "",
  ad: "",
  tur: "yuzde",
  deger: "",
  enAzTutar: "",
  kapsam: "hepsi",
  kapsamKayitlari: [],
  baslangic: "",
  bitis: "",
  toplamSinir: "",
  kisiBasiSinir: "",
  indirimdeGecmez: false,
  acik: true,
};

export type KuponEkraniVerisi = {
  // Yeni kuponda yok.
  kimlik?: string;
  gorulen?: string;
  kullanildi: boolean;
  form: KuponFormu;
  // Kapsamdaki silinmiş kayıtların adları (kupon onlarda geçmez; formda gösterilmez, uyarıda söylenir).
  silinmisKapsam: string[];
  paraSimgesi: { simge: string; yer: "basta" | "sonda" };
  saatDilimi: string;
  harfDuyarli: boolean;
  // Tutarların girildiği biçim (kart 0326): form onu gönderir, arada değiştiyse kayıt çakışır.
  fiyatGirisi: FiyatGirisi;
};

const ortakEkranVerisi = async () => {
  const site = calisanSite();
  const b = siteninBicimleyicisi(site.ayarlar);
  return {
    fiyatGirisi: (await siteninServisi(site).oku(siteninVeritabani())).fiyatGirisi,
    paraSimgesi: b.paraSimgesi(),
    saatDilimi: site.ayarlar.saatDilimi,
    harfDuyarli: site.ayarlar.kuponKoduHarfDuyarli,
  };
};

export const kuponEkraniVerisi = async (
  kimlik: string | undefined,
): Promise<KuponEkraniVerisi | undefined> => {
  if (kimlik === undefined) {
    return {
      ...(await ortakEkranVerisi()),
      kullanildi: false,
      form: bosKuponFormu,
      silinmisKapsam: [],
    };
  }
  const site = calisanSite();
  const b = siteninBicimleyicisi(site.ayarlar);
  const kupon = await kuponPanelAyrintisi(siteninVeritabani(), kimlik, { dil: site.ayarlar.dil });
  if (kupon === null) return undefined;
  const yerel = (an: Date | null) => (an === null ? "" : yerelZamana(an, site.ayarlar.saatDilimi));
  return {
    ...(await ortakEkranVerisi()),
    kimlik: kupon.kimlik,
    gorulen: kupon.degismeZamani.toISOString(),
    kullanildi: kupon.kullanildi,
    form: {
      kod: kupon.kod,
      ad: kupon.ad ?? "",
      tur: kupon.tur,
      deger:
        kupon.tur === "yuzde"
          ? String(kupon.deger)
          : kupon.tur === "tutar"
            ? b.paraYazisi(kupon.deger)
            : "",
      enAzTutar: kupon.enAzTutar === null ? "" : b.paraYazisi(kupon.enAzTutar),
      kapsam: kupon.kapsam,
      kapsamKayitlari: kupon.kapsamKayitlari
        .filter((kayit) => !kayit.silinmis)
        .map(({ kimlik: k, ad }) => ({ kimlik: k, ad })),
      baslangic: yerel(kupon.baslangic),
      bitis: yerel(kupon.bitis),
      toplamSinir: kupon.toplamSinir === null ? "" : String(kupon.toplamSinir),
      kisiBasiSinir: kupon.kisiBasiSinir === null ? "" : String(kupon.kisiBasiSinir),
      indirimdeGecmez: kupon.indirimdeGecmez,
      acik: kupon.durum !== "kapali",
    },
    silinmisKapsam: kupon.kapsamKayitlari.filter((kayit) => kayit.silinmis).map(({ ad }) => ad),
  };
};

export type KuponKullanimi = {
  numara: string;
  zaman: string;
  durum: SiparisDurumu;
  // Kısaltılmış ad; kişisel bilgisi silinmiş siparişte yok.
  musteri: string | null;
  uye: boolean;
  indirim: string;
  toplam: string;
  geriVerildi: boolean;
};

export type KuponSayfasiVerisi = {
  kimlik: string;
  gorulen: string;
  satir: KuponSatiri;
  // Komut çubuğunun altındaki açıklama: indirim, koşullar ve geçerlilik.
  aciklama: string;
  kapsamAdlari: { kimlik: string; ad: string; silinmis: boolean }[];
  acik: boolean;
  ozet: {
    kullanim: string;
    kalan: string | null;
    verilenIndirim: string;
    // Sayılan kullanımın siparişleri ("7 sipariş").
    siparisSayisi: string;
    siparisToplami: string;
    iadeSonrasi: string;
  };
  kullanimlar: {
    satirlar: KuponKullanimi[];
    toplam: number;
    sayfa: number;
    sayfaSayisi: number;
  };
};

export const kuponSayfasiVerisi = async (
  kimlik: string,
  sayfa: number,
): Promise<KuponSayfasiVerisi | undefined> => {
  const site = calisanSite();
  const vt = siteninVeritabani();
  const b = siteninBicimleyicisi(site.ayarlar);
  const kupon = await kuponPanelAyrintisi(vt, kimlik, { dil: site.ayarlar.dil });
  if (kupon === null) return undefined;
  const { panelSayfaBoyu } = await siteninMagazaAyarlari(vt, site);
  const kullanimlar = await kuponKullanimListesi(vt, kupon.kimlik, {
    sayfa,
    sayfaBoyu: panelSayfaBoyu,
  });
  const satir = satiriBicimle(b, kupon);
  return {
    kimlik: kupon.kimlik,
    gorulen: kupon.degismeZamani.toISOString(),
    satir,
    aciklama: [satir.indirim, satir.kosullar, satir.gecerlilik]
      .filter((parca): parca is string => parca !== null)
      .join(metin("yonetim.kupon.kosul.ayirici")),
    kapsamAdlari: kupon.kapsamKayitlari,
    acik: kupon.durum !== "kapali",
    ozet: {
      kullanim: satir.kullanim,
      // Kalan hak süren ödemelerin ayırdığından da düşer (vitrin sınıra onları da sayar); ayrılan varsa söylenir.
      kalan:
        kupon.toplamSinir === null
          ? kupon.ayrilan === 0
            ? null
            : doldur(metin("yonetim.kupon.ozet.suren"), { sayi: b.sayi(kupon.ayrilan) })
          : doldur(
              metin(
                kupon.ayrilan === 0 ? "yonetim.kupon.ozet.kalan" : "yonetim.kupon.ozet.kalanSuren",
              ),
              {
                sayi: b.sayi(Math.max(kupon.toplamSinir - kupon.kullanim - kupon.ayrilan, 0)),
                suren: b.sayi(kupon.ayrilan),
              },
            ),
      verilenIndirim: b.para(kupon.ozet.verilenIndirim),
      siparisSayisi: doldur(metin("yonetim.kupon.ozet.verilenIndirimAlt"), {
        sayi: b.sayi(kupon.kullanim),
      }),
      siparisToplami: b.para(kupon.ozet.siparisToplami),
      iadeSonrasi: b.para(kupon.ozet.iadeSonrasi),
    },
    kullanimlar: {
      satirlar: kullanimlar.satirlar.map((kullanim) => ({
        numara: kullanim.numara,
        zaman: b.tarihSaat(kullanim.zaman),
        durum: kullanim.durum,
        musteri: kullanim.adSoyad === null ? null : b.kisaAd(kullanim.adSoyad),
        uye: kullanim.uye,
        indirim: b.para(kullanim.indirim),
        toplam: b.para(kullanim.toplam),
        geriVerildi: kullanim.geriVerildi,
      })),
      toplam: kullanimlar.toplam,
      sayfa: kullanimlar.sayfa,
      sayfaSayisi: kullanimlar.sayfaSayisi,
    },
  };
};
