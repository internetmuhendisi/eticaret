// Ödeme sayfası (kart 0213, karar 0140): /odeme. Sayfa sunucuda başlığı ve formun verisini hazırlar: üye olmadan
// alışveriş ve telefon ayarı, sitenin teslimat ülkeleri il ve ilçe listeleriyle, ön bilgilendirme formu ve mesafeli
// satış sözleşmesinin satıcı satırları (satıcı bilgileri, mağaza adresi ve iletişim; kart 0091) ve teslim süresi.
// Sepet tarayıcıdadır: form ve özet tarayıcıda çizilir. Kişiye özel sayfa: arama motorlarına kapalıdır. Tema
// demosunda bulunamadı verir (ziyaretçi sipariş vermez).
import type { Metadata } from "next";
import { SayfaBasligi } from "../../../bilesenler/parcalar/sayfa-basligi";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { ilAdi, ilceAdi, postaKoduZorunluMu, ulkeninIlleri } from "../../bolgeler/bolgeler";
import { odemeSinirlari } from "../../kayitlar/odeme";
import { sifreSiniri } from "../../kayitlar/oturum";
import { metin, siteninBicimleyicisi } from "../../metinler/site-metni";
import { doldur } from "../../moduller/eposta/sablon";
import { sayfaBasligi } from "../../moduller/gorunurluk/sayfa-bilgisi";
import { magazaninAdi, siteninMagazaAyarlari } from "../../moduller/magaza-ayarlari/servis";
import { siteninVeritabani } from "../../veritabani/baglanti";
import { musteriSayfasiBilgisi, musteriSayfasiniAc } from "../yalniz-gezinti";
import { OdemeFormu, type OdemeSayfasiVerisi } from "./odeme-formu";

export const odemeSayfaBilgisi = musteriSayfasiBilgisi(
  async (): Promise<Metadata> => ({
    title: await sayfaBasligi(metin("vitrin.odeme.baslik")),
    robots: { index: false, follow: false },
  }),
);

const sayfaVerisi = async (): Promise<OdemeSayfasiVerisi> => {
  const site = calisanSite();
  const vt = siteninVeritabani();
  const [ayarlar, magazaAdi] = await Promise.all([
    siteninMagazaAyarlari(vt, site),
    magazaninAdi(vt, site),
  ]);
  const bicim = siteninBicimleyicisi(site.ayarlar);
  const ulkeler = site.ayarlar.teslimatUlkeleri.map((kod) => ({
    kod,
    ad: bicim.ulkeAdi(kod),
    iller: ulkeninIlleri(kod).map((il) => ({
      kod: il.kod,
      ad: il.ad,
      ilceler: il.ilceler.map((ilce) => ({ kod: ilce.kod, ad: ilce.ad })),
    })),
    postaKoduZorunlu: postaKoduZorunluMu(kod),
  }));
  // Satıcının satırları: unvan (yoksa mağaza adı), adres, iletişim ve kimlik numaraları; boş olan yazılmaz.
  const satici = ayarlar.saticiBilgileri;
  const adres = ayarlar.magazaAdresi;
  const bolge =
    adres === undefined
      ? undefined
      : [
          adres.ilce === undefined ? undefined : ilceAdi(adres.ilce),
          adres.il === undefined ? undefined : ilAdi(adres.il),
        ]
          .filter((parca) => parca !== undefined)
          .join(" / ");
  const saticiSatirlari = [
    satici?.unvan ?? magazaAdi,
    adres === undefined
      ? undefined
      : [adres.adres, adres.postaKodu, bolge, bicim.ulkeAdi(adres.ulke)]
          .filter((parca) => parca !== undefined && parca !== "")
          .join(", "),
    ayarlar.iletisimTelefonu,
    ayarlar.iletisimEpostasi,
    satici?.vergiDairesi === undefined && satici?.vergiNumarasi === undefined
      ? undefined
      : [satici.vergiDairesi, satici.vergiNumarasi]
          .filter((parca) => parca !== undefined)
          .join(" "),
    satici?.mersisNumarasi,
    satici?.kepAdresi,
  ].filter((satir): satir is string => satir !== undefined && satir !== "");
  return {
    uyeOlmadanAlisveris: ayarlar.uyeOlmadanAlisveris,
    telefonZorunlu: ayarlar.telefonZorunlu,
    ulkeler,
    satici: saticiSatirlari,
    teslimMetni:
      ayarlar.kargoyaVermeSuresi === 0
        ? metin("vitrin.odeme.sozlesme.teslimAyniGun")
        : doldur(metin("vitrin.odeme.sozlesme.teslim"), {
            gun: String(ayarlar.kargoyaVermeSuresi),
          }),
    sinirlar: { not: odemeSinirlari.notEnCok, sifreEnKisa: sifreSiniri.enKisa },
  };
};

export async function OdemeSayfasi() {
  musteriSayfasiniAc();
  const veri = await sayfaVerisi();
  return (
    <main className="mx-auto flex w-full max-w-icerik flex-col gap-4 px-4 pt-5 pb-12 tablet:px-6">
      <SayfaBasligi baslik={metin("vitrin.odeme.baslik")} className="mb-2" />
      <OdemeFormu veri={veri} />
    </main>
  );
}
