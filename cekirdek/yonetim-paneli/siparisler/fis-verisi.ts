// Sipariş fişinin verisi (kart 0270, karar 0171): bir ya da birden çok siparişin paketleme fişi. Siparişler ve
// kalemleri tek sorguyla, verilen sırayla gelir; kalemler, tutarlar ve fatura bilgisi ayrıntıdakiyle aynı yazılır
// (veri.ts). Fiyatlar mağaza sahibinin "fisteFiyatlar" ayarıyla; kapalıyken tutar hiç gönderilmez. Kişisel bilgisi
// silinmiş sipariş fişe girmez (adresi yoktur), numarası "atlanan"da döner. Olmayan numara yok sayılır.
// Mağazanın üst bilgisi ve alt satırı ayarlardan: ad, logo, satıcının unvanı ve vergi bilgileri, adres, telefon,
// e-posta. Mağazanın iç notları fişe girmez (fiş pakete konabilir); müşterinin notu girer.
import { asc, inArray } from "drizzle-orm";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { adresYazisi } from "../../bolgeler/adres-yazisi";
import { siteninBicimleyicisi } from "../../metinler/site-metni";
import { logonunYolu, magazaLogosu } from "../../moduller/magaza-ayarlari/logo";
import { magazaninAdi, siteninMagazaAyarlari } from "../../moduller/magaza-ayarlari/servis";
import { siparisKalemleri, siparisler } from "../../moduller/siparis/model";
import { siteninVeritabani } from "../../veritabani/baglanti";
import {
  adresSatirlari,
  type SiparisAyrintisiVerisi,
  siparisFaturaBilgisiVerisi,
  siparisKalemleriVerisi,
  siparisTutarlariVerisi,
} from "./veri";

export type SiparisFisi = {
  numara: string;
  zaman: string;
  odeme: { yontem: string; secenek: string | null };
  teslimat: { ad: string; telefon: string | null; satirlar: string[] };
  kargo: { firma: string; takipNumarasi: string | null } | null;
  fatura: SiparisAyrintisiVerisi["fatura"];
  kalemler: SiparisAyrintisiVerisi["kalemler"];
  kalemSayisi: number;
  urunSayisi: number;
  // Ayar kapalıyken null: fişte tutar yazmaz.
  tutarlar: SiparisAyrintisiVerisi["tutarlar"] | null;
  not: string | null;
};

export type FisMagazasi = {
  ad: string;
  logoAdresi: string | null;
  unvan: string | null;
  adres: string | null;
  telefon: string | null;
  eposta: string | null;
  vergiDairesi: string | null;
  vergiNumarasi: string | null;
  mersisNumarasi: string | null;
};

export type SiparisFisleriVerisi = {
  magaza: FisMagazasi;
  fisler: SiparisFisi[];
  // Kişisel bilgisi silindiği için fişi olmayan siparişlerin numaraları.
  atlanan: string[];
};

export const siparisFisleriVerisi = async (
  numaralar: readonly string[],
): Promise<SiparisFisleriVerisi> => {
  const site = calisanSite();
  const b = siteninBicimleyicisi(site.ayarlar);
  const vt = siteninVeritabani();
  const [ayarlar, ad, logo] = await Promise.all([
    siteninMagazaAyarlari(vt, site),
    magazaninAdi(vt, site),
    magazaLogosu(vt),
  ]);
  const satirlar =
    numaralar.length === 0
      ? []
      : await vt
          .select()
          .from(siparisler)
          .where(inArray(siparisler.numara, [...numaralar]));
  const kimlikler = satirlar.map((satir) => satir.kimlik);
  const kalemler =
    kimlikler.length === 0
      ? []
      : await vt
          .select()
          .from(siparisKalemleri)
          .where(inArray(siparisKalemleri.siparis_kimligi, kimlikler))
          .orderBy(asc(siparisKalemleri.sira));
  const numarayla = new Map(satirlar.map((satir) => [satir.numara, satir]));
  const sirali = numaralar
    .map((numara) => numarayla.get(numara))
    .filter((satir) => satir !== undefined);
  const satici = ayarlar.saticiBilgileri;
  return {
    magaza: {
      ad,
      logoAdresi: logo === undefined ? null : logonunYolu(logo),
      unvan: satici?.unvan ?? null,
      adres:
        ayarlar.magazaAdresi === undefined
          ? null
          : adresYazisi(ayarlar.magazaAdresi, b.ulkeAdi) || null,
      telefon: ayarlar.iletisimTelefonu ?? null,
      eposta: ayarlar.iletisimEpostasi ?? null,
      vergiDairesi: satici?.vergiDairesi ?? null,
      vergiNumarasi: satici?.vergiNumarasi ?? null,
      mersisNumarasi: satici?.mersisNumarasi ?? null,
    },
    fisler: sirali
      .filter((siparis) => siparis.kisisel_veri_silinme_zamani === null)
      .map((siparis) => {
        const kendi = kalemler.filter((kalem) => kalem.siparis_kimligi === siparis.kimlik);
        return {
          numara: siparis.numara,
          zaman: b.tarihSaat(siparis.olusturma_zamani),
          odeme: { yontem: siparis.odeme_yontemi, secenek: siparis.kapida_secenegi },
          teslimat: {
            ad: `${siparis.teslimat.ad} ${siparis.teslimat.soyad}`.trim(),
            telefon: siparis.teslimat.telefon ?? null,
            satirlar: adresSatirlari(siparis.teslimat.adres),
          },
          kargo:
            siparis.kargo_firmasi === null
              ? null
              : { firma: siparis.kargo_firmasi, takipNumarasi: siparis.takip_numarasi },
          fatura: siparisFaturaBilgisiVerisi(siparis.fatura),
          kalemler: siparisKalemleriVerisi(kendi, b),
          kalemSayisi: kendi.length,
          urunSayisi: kendi.reduce((toplam, kalem) => toplam + kalem.adet, 0),
          tutarlar: ayarlar.fisteFiyatlar ? siparisTutarlariVerisi(siparis, b) : null,
          not: siparis.not,
        };
      }),
    atlanan: sirali
      .filter((siparis) => siparis.kisisel_veri_silinme_zamani !== null)
      .map((siparis) => siparis.numara),
  };
};
