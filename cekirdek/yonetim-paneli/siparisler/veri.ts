// Panelin sipariş ekranlarının verisi (kart 0234, karar 0145; kart 0233'ün taslağı): sunucuda sipariş yönetimi
// servisiyle okunur, tutar ve zaman sitenin biçimleyicisiyle yazıya çevrilir (tarayıcı biçimlemez). Hangi işlemin
// görüneceği siparişin durumundan, ödeme yönteminden ve yöneticinin izinlerinden çıkar (siparisIslemleri).
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { adresYazisi, type YazilacakAdres } from "../../bolgeler/adres-yazisi";
import { eklentiliMi } from "../../eklentiler/odeme-yontemleri";
import { belgeSinirlari, yuklenebilenBelgeTurAdlari } from "../../kayitlar/dosya";
import type { OdemeYontemi } from "../../kayitlar/odeme";
import {
  type IadeNedeni,
  type IadeTalebiDurumu,
  type IadeTuru,
  iadeTurleri,
  iadeyeAcikDurumlar,
  type MusteriIadeNedeni,
  type SiparisDurumu,
  type SiparisIslemi,
  siparisDurumlari,
  yapilabilirIslemler,
} from "../../kayitlar/siparis";
import {
  type BicimAyarlari,
  gununBasi,
  takvimGunu,
  yerelZamandan,
} from "../../metinler/bicimleyici";
import { siteninBicimAyarlari, siteninBicimleyicisi } from "../../metinler/site-metni";
import { epostaGidebilirMi } from "../../moduller/eposta/gonderici";
import { siteninMagazaAyarlari } from "../../moduller/magaza-ayarlari/servis";
import { siparisAyarlari } from "../../moduller/siparis/ayarlar";
import { type SiparisFaturasi, siparisFaturaServisi } from "../../moduller/siparis/fatura";
import type { HesapSiparisi, OncekiIade } from "../../moduller/siparis/iade-hesabi";
import type { Siparis, SiparisKalemi } from "../../moduller/siparis/model";
import { siparisYonetimi } from "../../moduller/siparis/yonetim";
import { siteninVeritabani } from "../../veritabani/baglanti";
import { musteriAyrintisiAdresi } from "../adresler";
import { type ListeDurumu, type ListeVerisi, tarihSuzgecininAyrikGunleri } from "../liste/tanim";
import { bakilacakSekmesi, siparisListesiGirdisi } from "./liste-tanimi";

const bicim = () => siteninBicimleyicisi(calisanSite().ayarlar);

export type SiparisSatiri = {
  numara: string;
  zaman: string;
  musteri: string;
  uye: boolean;
  durum: SiparisDurumu;
  odeme: { yontem: string; secenek: string | null };
  tutar: string;
  havaleBildirildi: boolean;
  iadeTalebi: boolean;
  iadeBekliyor: boolean;
  talepOnaylandi: boolean;
  iadeBasarisiz: boolean;
};

// Listenin bir sayfası (kart 0258): sayfa ve liste ucu (aranan metinle) aynı işlevden okur. Sayfa başına satır
// mağaza sahibinin ayarıdır (panelSayfaBoyu). Sekme sayıları: "" bütün siparişler, her durum ve bakılması gereken.
// Tarih süzgecinin hazır aralıkları bugüne göre, bugün sitenin saat dilimiyle (kart 0267).
export const siparisListesiVerisi = async (
  durum: ListeDurumu,
): Promise<ListeVerisi<SiparisSatiri>> => {
  const site = calisanSite();
  const b = bicim();
  const vt = siteninVeritabani();
  const { panelSayfaBoyu } = await siteninMagazaAyarlari(vt, site);
  const bugun = takvimGunu(new Date(), site.ayarlar.saatDilimi);
  const liste = await siparisYonetimi(site).liste(
    vt,
    siparisListesiGirdisi(durum, panelSayfaBoyu, bugun),
  );
  return {
    satirlar: liste.satirlar.map((satir) => ({
      numara: satir.numara,
      durum: satir.durum,
      zaman: b.tarihSaat(satir.zaman),
      // Kısa ad (taslak): "Deniz Y."; kişisel bilgisi silinmiş siparişte boştur.
      musteri:
        `${satir.ad} ${satir.soyad}`.trim() === "" ? "" : b.kisaAd(`${satir.ad} ${satir.soyad}`),
      uye: satir.uye,
      odeme: { yontem: satir.odemeYontemi, secenek: satir.kapidaSecenegi },
      tutar: b.para(satir.toplam),
      havaleBildirildi: satir.havaleBildirildi,
      iadeTalebi: satir.iadeTalebi,
      iadeBekliyor: satir.iadeBekliyor,
      talepOnaylandi: satir.talepOnaylandi,
      iadeBasarisiz: satir.iadeBasarisiz,
    })),
    toplam: liste.toplam,
    sayfa: liste.sayfa,
    sayfaSayisi: liste.sayfaSayisi,
    sayfaBoyu: liste.sayfaBoyu,
    sekmeSayilari: {
      "": siparisDurumlari.reduce((toplam, kod) => toplam + liste.sayilar[kod], 0),
      ...liste.sayilar,
      [bakilacakSekmesi]: liste.bakilacakSayisi,
    },
  };
};

// Listenin süzgeçleri için sunucunun verdikleri (kart 0267): kargo firması seçenekleri (siparişlerdeki adlar) ve
// tarih süzgecindeki günlerin sitenin biçimiyle yazılışı (şerit ve seçili aralık; tarayıcı biçimlemez).
export const siparisListesiSecenekleri = async (
  durum: ListeDurumu,
): Promise<{
  kayitSecenekleri: Record<string, { deger: string; ad: string }[]>;
  gunYazilari: Record<string, string>;
}> => {
  const site = calisanSite();
  const b = bicim();
  const kargo = await siparisYonetimi(site).kargoFirmalari(siteninVeritabani());
  const gunler = tarihSuzgecininAyrikGunleri(durum, "tarih");
  return {
    kayitSecenekleri: { kargo: kargo.map((ad) => ({ deger: ad, ad })) },
    gunYazilari: Object.fromEntries(
      gunler.map((gun) => [gun, b.tarih(gununBasi(gun, site.ayarlar.saatDilimi))]),
    ),
  };
};

export type SatirYazani =
  | { tur: "musteri" | "yonetici" | "sahip"; eposta: string | null }
  | { tur: "sistem"; ad: string };

export type SiparisAyrintisiVerisi = {
  numara: string;
  durum: SiparisDurumu;
  ust: { zaman: string; yontem: string; secenek: string | null };
  kalemler: {
    ad: string;
    secim: string;
    stokKodu: string | null;
    adet: number;
    birim: string;
    tutar: string;
  }[];
  tutarlar: {
    araToplam: string;
    kargo: { tur: "yok" | "ucretsiz" | "ucretli"; tutar: string };
    toplam: string;
    vergiDahil: boolean;
    vergiler: { ad: string | null; oran: string; tutar: string }[];
  };
  kargo: {
    firma: string;
    takipNumarasi: string | null;
    takipAdresi: string | null;
    zaman: string;
  } | null;
  // ayrintiAdresi: üye müşterinin panel ayrıntısı (kart 0271), yalnız musteri.gor izni olana; yoksa null.
  musteri: {
    ad: string;
    eposta: string;
    telefon: string | null;
    uye: boolean;
    ayrintiAdresi: string | null;
  };
  teslimat: { satirlar: string[] };
  fatura:
    | { tur: "bireysel"; adresAyni: boolean; adres: string[] }
    | {
        tur: "kurumsal";
        firma: string;
        vergiDairesi: string;
        vergiNumarasi: string;
        adresAyni: boolean;
        adres: string[];
      };
  not: string | null;
  odeme: { tur: "alindi" | "bekleniyor" | "teslimde" | "alinmadi"; zaman: string | null };
  kisiselSilindi: boolean;
  bildirimler: {
    zaman: string;
    gonderen: string;
    banka: string;
    tutar: string;
    gun: string;
    not: string | null;
  }[];
  gecmis: (
    | {
        tur: "gecis";
        zaman: string;
        onceki: SiparisDurumu | null;
        sonraki: SiparisDurumu;
        neden: string;
        yazan: SatirYazani;
      }
    | { tur: "not"; zaman: string; notTuru: string; metin: string; yazan: SatirYazani }
  )[];
  // Yöneticinin bu durumda yapabileceği işlemler (izinli olanlar).
  islemler: SiparisIslemi[];
  // İptal ve iade (kart 0235): penceresinin verisi (izni varsa, siparişin durumu izin veriyorsa ve bekleyen iade yoksa).
  iade: IadePenceresiVerisi | null;
  // Siparişin iptal ve iadeleri, en yeni önce.
  iadeler: {
    kimlik: string;
    zaman: string;
    tur: IadeTuru;
    durum: "bekliyor" | "tamamlandi" | "basarisiz";
    yontem: "kurulus" | "elle" | "yok";
    tutar: string;
    vergiler: { ad: string | null; oran: string; tutar: string }[];
    kalemler: { ad: string; adet: number }[];
    kargo: string | null;
    stogaKondu: boolean;
    neden: IadeNedeni;
    aciklama: string | null;
    yazan: SatirYazani;
  }[];
  // Müşterinin iade talepleri, en yeni önce (kart 0239). Bekleyen ve onaylanıp iadesi yapılmamış talep ekranın
  // üstünde kutudur.
  talepler: {
    kimlik: string;
    durum: IadeTalebiDurumu;
    zaman: string;
    kararZamani: string | null;
    kalemler: { ad: string; adet: number }[];
    neden: MusteriIadeNedeni;
    aciklama: string | null;
    retAciklamasi: string | null;
    iadeYapildi: boolean;
  }[];
  // Talebe karar verebilir mi (siparis.iade).
  talepKarariVerilebilir: boolean;
  iadeKargosu: "magaza" | "musteri";
  // Bekleyen iadeyi yeniden deneyebilir mi (izin).
  iadeYenidenDenenebilir: boolean;
  notEkleyebilir: boolean;
  kargoFirmalari: { kimlik: string; ad: string }[];
  // Siparişin faturası (kart 0268, karar 0170): numara, takvim günü ve sitenin biçimiyle tarihi, dosyası (boyutu
  // sitenin biçimiyle); yoksa null.
  faturaBelgesi: {
    numara: string;
    tarih: string;
    tarihYazisi: string;
    dosya: { kimlik: string; boyut: string } | null;
  } | null;
  // Faturayı ekleyip değiştirebilir mi (siparis.yonet); dosya eklenebilir mi (kişisel bilgisi silinmemiş sipariş).
  faturaDuzenlenebilir: boolean;
  faturaDosyasiEklenebilir: boolean;
  // "Faturanız hazır" e-postası bu siparişe gidebilir mi: kişisel bilgisi silinmemiş ve sitenin e-postası gidiyor.
  faturaEpostasiGidebilir: boolean;
  // Belgenin sınırı ve türlerinin adları, sitenin biçimiyle (yükleme alanının açıklaması ve hatası).
  belge: { enCokBoyut: string; turler: string };
  // Sitenin saat dilimindeki bugün, "YYYY-AA-GG": yeni faturanın tarih alanının başlangıcı.
  bugun: string;
};

export type IadePenceresiVerisi = {
  turler: IadeTuru[];
  durum: SiparisDurumu;
  hesap: HesapSiparisi;
  onceki: OncekiIade[];
  kalemler: { sira: number; ad: string; secim: string; adet: number; iadeEdilen: number }[];
  // Kargo ücreti iade edilebilir mi (ücretli ve henüz iade edilmedi).
  kargoIadeEdilebilir: boolean;
  // Para nereden döner: ödeme kuruluşu, mağaza sahibi (elle) ya da ödeme alınmadı.
  para: "kurulus" | "elle" | "yok";
  bicim: BicimAyarlari;
  // Onaylanmış ve iadesi yapılmamış talep (kart 0239): iade penceresi onunla seçili açılır.
  talep: { kimlik: string; kalemler: { sira: number; adet: number }[]; neden: IadeNedeni } | null;
};

type Bicim = ReturnType<typeof bicim>;
type TutarSutunlari = Pick<
  Siparis,
  "ara_toplam" | "kargo_turu" | "kargo_tutari" | "toplam" | "gosterim" | "vergi_dokumu"
>;

// Ayrıntı ile sipariş fişinin (kart 0270) ortak parçaları: kalemler, tutarlar ve fatura bilgisi aynı yazılır.
export const siparisKalemleriVerisi = (
  kalemler: readonly SiparisKalemi[],
  b: Bicim,
): SiparisAyrintisiVerisi["kalemler"] =>
  kalemler.map((kalem) => ({
    ad: kalem.urun_adi,
    secim: kalem.secim.map(({ secenek, deger }) => `${secenek}: ${deger}`).join(" · "),
    stokKodu: kalem.stok_kodu,
    adet: kalem.adet,
    birim: b.para(kalem.birim_tutari),
    tutar: b.para(kalem.tutar),
  }));

export const siparisTutarlariVerisi = (
  siparis: TutarSutunlari,
  b: Bicim,
): SiparisAyrintisiVerisi["tutarlar"] => ({
  araToplam: b.para(siparis.ara_toplam),
  kargo: {
    tur: siparis.kargo_turu as "yok" | "ucretsiz" | "ucretli",
    tutar: b.para(siparis.kargo_tutari),
  },
  toplam: b.para(siparis.toplam),
  vergiDahil: siparis.gosterim !== "vergi-haric",
  vergiler: siparis.vergi_dokumu.map((satir) => ({
    ad: satir.ad ?? null,
    oran: b.yuzde(satir.oran / 10_000),
    tutar: b.para(satir.vergi),
  })),
});

export const siparisFaturaBilgisiVerisi = (
  fatura: Siparis["fatura"],
): SiparisAyrintisiVerisi["fatura"] => {
  const adres = fatura.adresAyni || fatura.adres === undefined ? [] : adresSatirlari(fatura.adres);
  return fatura.tur === "kurumsal"
    ? {
        tur: "kurumsal",
        firma: fatura.firma,
        vergiDairesi: fatura.vergiDairesi,
        vergiNumarasi: fatura.vergiNumarasi,
        adresAyni: fatura.adresAyni,
        adres,
      }
    : { tur: "bireysel", adresAyni: fatura.adresAyni, adres };
};

// Adresin satırları: ad (varsa) ve tek satırlık adres yazısı (il ve ilçe adlarıyla, ülkeyle; adresYazisi).
export const adresSatirlari = (adres: YazilacakAdres): string[] => {
  const yazi = adresYazisi(adres, bicim().ulkeAdi);
  return yazi === "" ? [] : [yazi];
};

// Faturanın panelde gösterilecek hâli (kart 0268).
const faturaBelgesiVerisi = (
  fatura: SiparisFaturasi | null,
  b: ReturnType<typeof bicim>,
): SiparisAyrintisiVerisi["faturaBelgesi"] =>
  fatura === null
    ? null
    : {
        numara: fatura.numara,
        tarih: fatura.tarih,
        tarihYazisi: b.uzunTarih(gununBasi(fatura.tarih, calisanSite().ayarlar.saatDilimi)),
        dosya:
          fatura.dosya === null
            ? null
            : { kimlik: fatura.dosya.kimlik, boyut: b.dosyaBoyutu(fatura.dosya.boyut) },
      };

export const siparisAyrintisiVerisi = async (
  numara: string,
  yetkili: (
    izin: "siparis.yonet" | "siparis.havale-onayla" | "siparis.iade" | "musteri.gor",
  ) => boolean,
): Promise<SiparisAyrintisiVerisi | null> => {
  const site = calisanSite();
  const b = bicim();
  const vt = siteninVeritabani();
  const ayrinti = await siparisYonetimi(site).ayrinti(vt, numara);
  if (ayrinti === null) return null;
  const { siparis } = ayrinti;
  const durum = siparis.durum as SiparisDurumu;
  const kisiselSilindi = siparis.kisisel_veri_silinme_zamani !== null;
  // Kuruluşun yanıtını bekleyen iade varken durum işlemi yapılmaz (sunucu da reddeder): düğmeler görünmez.
  const islemler = ayrinti.iadeler.some((iade) => iade.durum === "bekliyor")
    ? []
    : yapilabilirIslemler(durum, siparis.odeme_yontemi, yetkili);
  const yazan = (y: (typeof ayrinti.gecmis)[number]["yazan"]): SatirYazani => y;
  const gecmis: SiparisAyrintisiVerisi["gecmis"] = [
    ...ayrinti.gecmis.map((satir) => ({
      tur: "gecis" as const,
      an: satir.zaman.getTime(),
      zaman: b.tarihSaat(satir.zaman),
      onceki: satir.onceki,
      sonraki: satir.sonraki,
      neden: satir.neden,
      yazan: yazan(satir.yazan),
    })),
    ...ayrinti.notlar.map((satir) => ({
      tur: "not" as const,
      an: satir.zaman.getTime(),
      zaman: b.tarihSaat(satir.zaman),
      notTuru: satir.tur,
      metin: satir.metin,
      yazan: yazan(satir.yazan),
    })),
  ]
    // En yeni önce; aynı anda yazılan geçiş ve notta geçiş önce gelir.
    .sort((x, y) => y.an - x.an || (x.tur === y.tur ? 0 : x.tur === "gecis" ? -1 : 1))
    .map(({ an: _an, ...satir }) => satir);
  const [{ kargoFirmalari, iadeKargosu }, faturaBelgesi] = await Promise.all([
    siparisAyarlari(site).oku(vt),
    siparisFaturaServisi(site).oku(vt, siparis.kimlik),
  ]);
  // İade penceresi en eski onaylı ve iadesi yapılmamış talebe bağlanır (sırayla kapanır).
  const onayliTalep = ayrinti.talepler.find(
    (talep) => talep.durum === "onaylandi" && !talep.iadeYapildi,
  );
  return {
    numara: siparis.numara,
    durum,
    ust: {
      zaman: b.tarihSaat(siparis.olusturma_zamani),
      yontem: siparis.odeme_yontemi,
      secenek: siparis.kapida_secenegi,
    },
    kalemler: siparisKalemleriVerisi(ayrinti.kalemler, b),
    tutarlar: siparisTutarlariVerisi(siparis, b),
    kargo:
      siparis.kargo_firmasi === null || siparis.kargo_zamani === null
        ? null
        : {
            firma: siparis.kargo_firmasi,
            takipNumarasi: siparis.takip_numarasi,
            takipAdresi: siparis.takip_adresi,
            zaman: b.tarihSaat(siparis.kargo_zamani),
          },
    musteri: {
      ad: `${siparis.teslimat.ad} ${siparis.teslimat.soyad}`.trim(),
      eposta: siparis.eposta,
      telefon: siparis.teslimat.telefon ?? null,
      uye: siparis.musteri_kimligi !== null,
      ayrintiAdresi:
        siparis.musteri_kimligi !== null && yetkili("musteri.gor")
          ? musteriAyrintisiAdresi(siparis.musteri_kimligi)
          : null,
    },
    teslimat: { satirlar: adresSatirlari(siparis.teslimat.adres) },
    fatura: siparisFaturaBilgisiVerisi(siparis.fatura),
    not: siparis.not,
    odeme:
      siparis.odeme_zamani !== null
        ? { tur: "alindi", zaman: b.tarihSaat(siparis.odeme_zamani) }
        : durum === "iptal"
          ? { tur: "alinmadi", zaman: null }
          : siparis.odeme_son_zamani !== null
            ? { tur: "bekleniyor", zaman: b.tarihSaat(siparis.odeme_son_zamani) }
            : { tur: "teslimde", zaman: null },
    kisiselSilindi,
    bildirimler: ayrinti.bildirimler.map((bildirim) => ({
      zaman: b.tarihSaat(bildirim.zaman),
      gonderen: bildirim.gonderen,
      banka: bildirim.banka,
      tutar: b.para(bildirim.tutar),
      // Müşterinin yazdığı ödeme günü sitenin takviminde öğlen olarak okunur.
      gun: (() => {
        const an = yerelZamandan(`${bildirim.odemeTarihi}T12:00`, site.ayarlar.saatDilimi);
        return an === undefined ? bildirim.odemeTarihi : b.tarih(an);
      })(),
      not: bildirim.not,
    })),
    gecmis,
    islemler,
    iade: (() => {
      const bekleyen = ayrinti.iadeler.some((iade) => iade.durum === "bekliyor");
      const turler = iadeTurleri.filter((tur) =>
        (iadeyeAcikDurumlar[tur] as readonly SiparisDurumu[]).includes(durum),
      );
      if (bekleyen || turler.length === 0 || !yetkili("siparis.iade")) return null;
      const tamamlanan = ayrinti.iadeler.filter((iade) => iade.durum === "tamamlandi");
      const odenen =
        siparis.odeme_zamani === null ? null : (siparis.tahsilat?.odenen ?? siparis.toplam);
      return {
        turler,
        durum,
        hesap: {
          toplam: siparis.toplam,
          vergiToplami: siparis.vergi_toplami,
          vergiDokumu: siparis.vergi_dokumu,
          odenen,
          kalemler: ayrinti.kalemler.map((kalem) => ({
            sira: kalem.sira,
            adet: kalem.adet,
            vergisiz: kalem.vergisiz,
            vergi: kalem.vergi,
            vergiOranlari: kalem.vergi_oranlari,
          })),
        },
        onceki: tamamlanan.map((iade) => ({
          tutar: iade.tutar,
          kargoTutari: iade.kargo_tutari,
          kalemler: iade.kalemler,
        })),
        kalemler: ayrinti.kalemler.map((kalem) => ({
          sira: kalem.sira,
          ad: kalem.urun_adi,
          secim: kalem.secim.map(({ secenek, deger }) => `${secenek}: ${deger}`).join(" · "),
          adet: kalem.adet,
          iadeEdilen: tamamlanan
            .flatMap((iade) => iade.kalemler)
            .filter((secilen) => secilen.sira === kalem.sira)
            .reduce((toplam, secilen) => toplam + secilen.adet, 0),
        })),
        kargoIadeEdilebilir:
          siparis.kargo_turu === "ucretli" && !tamamlanan.some((iade) => iade.kargo_tutari > 0),
        para:
          odenen === null
            ? "yok"
            : eklentiliMi(siparis.odeme_yontemi as OdemeYontemi)
              ? "kurulus"
              : "elle",
        bicim: siteninBicimAyarlari(site.ayarlar),
        talep:
          onayliTalep === undefined
            ? null
            : {
                kimlik: onayliTalep.kimlik,
                kalemler: onayliTalep.kalemler,
                neden: onayliTalep.neden as IadeNedeni,
              },
      } satisfies IadePenceresiVerisi;
    })(),
    iadeler: ayrinti.iadeler.map((iade) => ({
      kimlik: iade.kimlik,
      zaman: b.tarihSaat(iade.olusturma_zamani),
      tur: iade.tur as IadeTuru,
      durum: iade.durum as "bekliyor" | "tamamlandi" | "basarisiz",
      yontem: iade.yontem as "kurulus" | "elle" | "yok",
      tutar: b.para(iade.tutar),
      vergiler: iade.vergi_dokumu.map((satir) => ({
        ad: satir.ad ?? null,
        oran: b.yuzde(satir.oran / 10_000),
        tutar: b.para(satir.vergi),
      })),
      kalemler: iade.kalemler.map((secilen) => ({
        ad: ayrinti.kalemler.find((kalem) => kalem.sira === secilen.sira)?.urun_adi ?? "",
        adet: secilen.adet,
      })),
      kargo: iade.kargo_tutari > 0 ? b.para(iade.kargo_tutari) : null,
      stogaKondu: iade.stoga_konacak,
      neden: iade.neden as IadeNedeni,
      aciklama: iade.aciklama,
      yazan: iade.yazan,
    })),
    talepler: ayrinti.talepler
      .map((talep) => ({
        kimlik: talep.kimlik,
        durum: talep.durum as IadeTalebiDurumu,
        zaman: b.tarihSaat(talep.olusturma_zamani),
        kararZamani: talep.karar_zamani === null ? null : b.tarihSaat(talep.karar_zamani),
        kalemler: talep.kalemler.map((secilen) => ({
          ad: ayrinti.kalemler.find((kalem) => kalem.sira === secilen.sira)?.urun_adi ?? "",
          adet: secilen.adet,
        })),
        neden: talep.neden as MusteriIadeNedeni,
        aciklama: talep.aciklama,
        retAciklamasi: talep.ret_aciklamasi,
        iadeYapildi: talep.iadeYapildi,
      }))
      .reverse(),
    faturaBelgesi: faturaBelgesiVerisi(faturaBelgesi, b),
    bugun: takvimGunu(new Date(), site.ayarlar.saatDilimi),
    faturaDuzenlenebilir: yetkili("siparis.yonet"),
    faturaDosyasiEklenebilir: !kisiselSilindi,
    faturaEpostasiGidebilir: !kisiselSilindi && epostaGidebilirMi(site.ayarlar),
    belge: {
      enCokBoyut: b.dosyaBoyutu(belgeSinirlari.enCokBayt),
      turler: b.veyaListesi(yuklenebilenBelgeTurAdlari),
    },
    talepKarariVerilebilir: yetkili("siparis.iade"),
    iadeKargosu,
    iadeYenidenDenenebilir: yetkili("siparis.iade"),
    notEkleyebilir: yetkili("siparis.yonet"),
    kargoFirmalari: kargoFirmalari.map(({ kimlik, ad }) => ({ kimlik, ad })),
  };
};

export const siparisAyarlariVerisi = async () => {
  const ayarlar = siparisAyarlari(calisanSite());
  return {
    ...(await ayarlar.oku(siteninVeritabani())),
    gorunenBildirimler: ayarlar.gorunenBildirimler(),
  };
};
