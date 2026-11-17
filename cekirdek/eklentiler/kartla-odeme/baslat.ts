// Kartla ödemenin başlatılması (kart 0215, karar 0142). Ödeme servisi "Siparişi onayla"da oturumu ve ayırmayı yazdıktan
// sonra bağlantı noktasından (cekirdek/eklentiler/odeme-yontemleri.ts) burayı çağırır.
//
// - Hazır: eklenti açık, ödeme kuruluşunun anahtarları var ve sitenin adresi biliniyor (dönüş adresi). Hazır değilse
//   "Kartla öde" müşteriye görünmez. Sitenin para birimini kuruluşun desteklediği eklenti açılırken denetlenir
//   (çekirdekte para birimi kodu yazılmaz); desteklemiyorsa ödeme başlatılamaz, müşteri "yontem-ulasilamadi" görür.
// - Kuruluşa giden tutar oturumun toplamıdır (sunucunun hesabı). Kalemlerin toplamı tutara eşit olmalıdır: satırların
//   ve kargonun tutarı yazılır, gösterimden kalan fark (vergi hariç gösterimde vergi, yuvarlama) son ürün kalemine eklenir.
// - Alıcının kimlik numarası sorulmaz (kullanıcı kararı): kurumsal faturada vergi numarası, bireyselde yer tutucu.
// - Kuruluşa ulaşılamazsa ya da yanıtı tutmazsa hata kaydedilir ve "yontem-ulasilamadi" döner; ödeme satırı yazılmaz.
import { eq, inArray } from "drizzle-orm";
import { disaridanGizliBilgi } from "../../ayar-semasi/disaridan-gizli-bilgi.ts";
import { siteAdresi } from "../../ayar-semasi/site-adresi.ts";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { ilAdi, ilceAdi } from "../../bolgeler/bolgeler.ts";
import { hatayiKaydet } from "../../izleme/hata-katmani.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import { kartlaOdemeAyari } from "../../kayitlar/eklentiler.ts";
import { odemeBaslatilamadi } from "../../kayitlar/odeme.ts";
import { metin, siteninBicimleyicisi } from "../../metinler/site-metni.ts";
import { siteninMagazaAyarlari } from "../../moduller/magaza-ayarlari/servis.ts";
import { faturaAdresi } from "../../moduller/odeme/oturum-hesabi.ts";
import { urunBirimleri, urunler } from "../../moduller/urun/model.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { eklentiAcikMi } from "../acik.ts";
import type { EklentiliOdemeGirdisi } from "../odeme-yontemleri.ts";
import { type FormGirdisi, type KurulusAnahtarlari, odemeFormuBaslat } from "./iyzico.ts";
import { kartOdemeleri } from "./model.ts";

// Dönüş ucunun yolu (cekirdek/kapi/herkese-acik/kartla-odeme-donus.ts).
export const donusYolu = "/kapi/herkese-acik/kartla-odeme/donus";

export const kurulusAnahtarlari = (): KurulusAnahtarlari | undefined => {
  const anahtar = disaridanGizliBilgi("KARTLA_ODEME_ANAHTARI");
  const gizli = disaridanGizliBilgi("KARTLA_ODEME_GIZLI_ANAHTARI");
  return anahtar === undefined || gizli === undefined ? undefined : { anahtar, gizli };
};

export const kartlaOdemeHazirMi = (site: Pick<Site, "ayarlar" | "kimlik">): boolean =>
  eklentiAcikMi(site, "kartla-odeme") &&
  kurulusAnahtarlari() !== undefined &&
  siteAdresi(site.kimlik) !== undefined;

// Ödeme kuruluşunun kalemleri: toplamları oturumun toplamına eşit.
const kalemleriKur = async (
  vt: Veritabani,
  girdi: EklentiliOdemeGirdisi,
): Promise<FormGirdisi["kalemler"]> => {
  const satirlar = girdi.hesap.satirlar.filter(
    (satir) => satir.satilabilir && satir.tutar !== undefined,
  );
  const adlar = new Map(
    (
      await vt
        .select({ birim: urunBirimleri.kimlik, ad: urunler.ad })
        .from(urunBirimleri)
        .innerJoin(urunler, eq(urunler.kimlik, urunBirimleri.urun_kimligi))
        .where(
          inArray(
            urunBirimleri.kimlik,
            satirlar.map((satir) => satir.birim),
          ),
        )
    ).map((satir) => [satir.birim, satir.ad]),
  );
  const kategori = metin("eklenti.kartlaOdeme.kategori");
  const kalemler = satirlar.map((satir) => ({
    kimlik: satir.birim,
    ad: adlar.get(satir.birim) ?? kategori,
    kategori,
    tutar: satir.tutar ?? 0,
  }));
  const { kargo } = girdi.hesap;
  if (kargo.tur === "ucretli") {
    const ad = metin("eklenti.kartlaOdeme.kargo");
    kalemler.push({ kimlik: "kargo", ad, kategori: ad, tutar: kargo.tutar });
  }
  const fark = girdi.hesap.toplam - kalemler.reduce((toplam, kalem) => toplam + kalem.tutar, 0);
  const son = kalemler.findLast((kalem) => kalem.kimlik !== "kargo");
  if (son === undefined) throw new Error("Satılabilir kalem yok.");
  son.tutar += fark;
  if (kalemler.some((kalem) => kalem.tutar <= 0)) {
    throw new Error("Ödeme kuruluşunun kalemleri sıfır ya da eksi tutar taşıyor.");
  }
  return kalemler;
};

export const kartlaOdemeyiBaslat = async (
  vt: Veritabani,
  site: Site,
  girdi: EklentiliOdemeGirdisi,
): Promise<{ adres: string }> => {
  const anahtarlar = kurulusAnahtarlari();
  const adres = siteAdresi(site.kimlik);
  if (!kartlaOdemeHazirMi(site) || anahtarlar === undefined || adres === undefined) {
    throw new BilinenHata("is-kurali", [{ alan: "bilgiler.odemeYontemi", kod: "yontem-kapali" }]);
  }
  const ayarlar = await siteninMagazaAyarlari(vt, site);
  const bicim = siteninBicimleyicisi(site.ayarlar);
  const { teslimat, fatura } = girdi;
  const faturaninAdresi = faturaAdresi(girdi);
  // Açık adres ve ilçenin adı (il ayrı alandadır).
  const adresSatiri = (posta: typeof teslimat.adres) =>
    [posta.adres, posta.ilce === undefined ? undefined : ilceAdi(posta.ilce)]
      .filter((parca) => parca !== undefined)
      .join(", ");
  const yer = (posta: typeof teslimat.adres) => ({
    il: (posta.il === undefined ? undefined : ilAdi(posta.il)) ?? posta.il ?? posta.ulke,
    ulke: bicim.ulkeAdi(posta.ulke),
    adres: adresSatiri(posta),
    postaKodu: posta.postaKodu,
  });
  const kisi = `${teslimat.ad} ${teslimat.soyad}`;
  const faturaKisisi = fatura.tur === "kurumsal" ? fatura.firma : kisi;
  try {
    const kalemler = await kalemleriKur(vt, girdi);
    const form = await odemeFormuBaslat(site.ayarlar.kartlaOdemeOrtami, anahtarlar, {
      oturum: girdi.oturum,
      tutar: girdi.hesap.toplam,
      paraBirimi: girdi.hesap.paraBirimi,
      donusAdresi: `${adres}${donusYolu}`,
      taksitler: kartlaOdemeAyari.taksitSecenekleri.filter(
        (sayi) => sayi <= ayarlar.kartlaOdemeEnCokTaksit,
      ),
      alici: {
        kimlik: girdi.musteri ?? girdi.oturum,
        ad: teslimat.ad,
        soyad: teslimat.soyad,
        kimlikNumarasi:
          fatura.tur === "kurumsal" ? fatura.vergiNumarasi : kartlaOdemeAyari.kimlikYerTutucu,
        eposta: girdi.eposta,
        // Telefon zorunlu değilse boş: kuruluşun alanı zorunludur, yer tutucu yazılmaz, telefonsuz form da açılır.
        telefon: teslimat.telefon ?? "",
        ...yer(teslimat.adres),
        ...(girdi.ip === undefined || girdi.ip === "yerel" ? {} : { ip: girdi.ip }),
      },
      teslimat: { kisi, ...yer(teslimat.adres) },
      fatura: { kisi: faturaKisisi, ...yer(faturaninAdresi) },
      kalemler,
    });
    await vt.insert(kartOdemeleri).values({
      oturum_kimligi: girdi.oturum,
      belirtec: form.belirtec,
      durum: "baslatildi",
      ortam: site.ayarlar.kartlaOdemeOrtami,
      tutar: girdi.hesap.toplam,
      para_birimi: girdi.hesap.paraBirimi,
    });
    return { adres: form.adres };
  } catch (hata) {
    hatayiKaydet(hata, { islem: "kartla-odeme-baslat" });
    throw new BilinenHata("is-kurali", [
      { alan: "bilgiler.odemeYontemi", kod: odemeBaslatilamadi },
    ]);
  }
};
