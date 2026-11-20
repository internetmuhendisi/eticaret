// Ödeme oturumunun hesabı ve eklentili ödemenin siparişi (kart 0215, karar 0142). Eklentiyle gelen yöntemde (kart)
// sipariş "Siparişi onayla"da değil, ödeme kuruluşu ödemeyi doğrulayınca kurulur. O an oturumun kalemleri sunucuda
// yeniden hesaplanır (sepetiHesapla, aynı teslimat ve fatura bölgesiyle) ve müşterinin ödediği oturum toplamıyla
// karşılaştırılır: fiyat ya da vergi arada değiştiyse sipariş kurulmaz ("sepet-degisti"), ödeme iptal edilir.
//
// Kurallar:
// - eklentiliSiparisiKur kendi işlemini açar; eklenti kendi ödeme satırını aynı işlemde yazar (once, sonra). Oturum
//   satırı kilitlenir: aynı oturuma aynı anda gelen iki tamamlama sırayla çalışır; sipariş oturuma tekildir.
// - Stok siparisiKur'un stokDus'uyla düşer: oturumun kendi ayırması siparişe geçer, ayırma süresi dolduysa ve stok
//   başka müşteriye satıldıysa "stok-ayrildi" ile durur.
// - Sipariş "hazırlanıyor" durumuyla ve tahsilat bilgisiyle (ödenen tutar, taksit, ödeme kimliği) kurulur.
import { eq } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { siteninMagazaAyarlari } from "../magaza-ayarlari/servis.ts";
import { type SepetHesabi, sepetiHesapla } from "../sepet/hesap.ts";
import type { Tahsilat } from "../siparis/model.ts";
import { type KurulanSiparis, siparisServisi } from "../siparis/servis.ts";
import { odemeOturumlari } from "./model.ts";
import type { Fatura, OdemeYontemiSecimi, Teslimat } from "./semalar.ts";

// Verginin bölgesi: posta adresinin ülkesi, ili ve posta kodu.
export const bolge = (adres: {
  ulke: string;
  il?: string | undefined;
  postaKodu?: string | undefined;
}) => ({
  ulke: adres.ulke,
  ...(adres.il === undefined ? {} : { il: adres.il }),
  ...(adres.postaKodu === undefined ? {} : { postaKodu: adres.postaKodu }),
});

// "Aynı" işaretliyse faturanın adresi teslimat adresidir.
export const faturaAdresi = (bilgiler: { fatura: Fatura; teslimat: Teslimat }) =>
  bilgiler.fatura.adres ?? bilgiler.teslimat.adres;

// Eklentili ödemenin siparişi kurulamadıysa nedeni: ödeme iptal edilir, müşteriye söylenir. Hata olarak atılır:
// çağıranın işlemi geri alınır (siparisiKur stoğu düşemeden önce siparişi yazmış olabilir).
export type KurulamamaNedeni = "stok-yok" | "sepet-degisti" | "oturum-yok";
export class SiparisKurulamadi extends Error {
  readonly neden: KurulamamaNedeni;
  constructor(neden: KurulamamaNedeni) {
    super(`Eklentili ödemenin siparişi kurulamadı: ${neden}`);
    this.neden = neden;
  }
}

// Oturumun hesabı işlemden önce yapılır (sepet hesabı ve ayarlar veritabanının kendisiyle okunur); işlemin içinde oturum
// kilitlenir ve toplam yeniden karşılaştırılır, stok stokDus'un koşuluyla denetlenir. Eklenti kendi satırını aynı
// işlemde yazar: once (sipariş kurulmadan önce, ör. ödeme satırını kilitlemek) ve sonra (kurulan siparişle).
export const eklentiliSiparisiKur = async (
  vt: Veritabani,
  site: Site,
  girdi: {
    oturum: string;
    odeme: Extract<OdemeYontemiSecimi, { yontem: "kart" }>;
    tahsilat: Tahsilat;
    // Ödeme kuruluşunun söylediği tutar ve para birimi: oturumun toplamıyla aynı olmalı.
    tutar: number;
    paraBirimi: string;
  },
  islemde: {
    once: (islem: VeritabaniIslemi) => Promise<void>;
    sonra: (islem: VeritabaniIslemi, siparis: KurulanSiparis) => Promise<void>;
  },
): Promise<KurulanSiparis> => {
  const [okunan] = await vt
    .select()
    .from(odemeOturumlari)
    .where(eq(odemeOturumlari.kimlik, girdi.oturum))
    .limit(1);
  if (okunan === undefined) throw new SiparisKurulamadi("oturum-yok");
  if (girdi.tutar !== okunan.toplam || girdi.paraBirimi !== okunan.para_birimi) {
    throw new SiparisKurulamadi("sepet-degisti");
  }
  // Oturumun bölgeleriyle sunucunun bugünkü hesabı.
  const hesap: SepetHesabi = await sepetiHesapla(vt, site, okunan.kalemler, {
    adresler: {
      teslimat: bolge(okunan.teslimat.adres),
      fatura: bolge(faturaAdresi(okunan)),
    },
  });
  const satilanlar = hesap.satirlar.filter((satir) => satir.satilabilir);
  if (
    hesap.toplam !== okunan.toplam ||
    hesap.paraBirimi !== okunan.para_birimi ||
    satilanlar.length !== okunan.kalemler.length ||
    okunan.kalemler.some(
      (kalem) =>
        !satilanlar.some((satir) => satir.birim === kalem.birim && satir.adet === kalem.adet),
    )
  ) {
    // Satılamayan satır (birim silindi, ürün taslağa döndü, tükendi) "stok-yok"; fiyat ya da vergi farkı
    // "sepet-degisti". İkisinde de ödeme iptal edilir.
    throw new SiparisKurulamadi(
      hesap.satirlar.some((satir) => !satir.satilabilir) ? "stok-yok" : "sepet-degisti",
    );
  }
  const ayarlar = await siteninMagazaAyarlari(vt, site);
  try {
    return await vt.transaction(async (islem) => {
      const [oturum] = await islem
        .select()
        .from(odemeOturumlari)
        .where(eq(odemeOturumlari.kimlik, girdi.oturum))
        .for("update");
      if (oturum === undefined) throw new SiparisKurulamadi("oturum-yok");
      await islemde.once(islem);
      const siparis = await siparisServisi(site).siparisiKur(islem, {
        oturum: {
          kimlik: oturum.kimlik,
          musteri: oturum.musteri_kimligi,
          eposta: oturum.eposta,
          teslimat: oturum.teslimat,
          fatura: oturum.fatura,
          not: oturum.not,
          onaylar: oturum.onaylar,
        },
        hesap,
        odeme: girdi.odeme,
        havaleIptalSuresi: ayarlar.havaleIptalSuresi,
        tahsilat: girdi.tahsilat,
        stokUyarisi: { dusukStokEsigi: ayarlar.dusukStokEsigi },
      });
      await islemde.sonra(islem, siparis);
      return siparis;
    });
  } catch (hata) {
    if (
      hata instanceof BilinenHata &&
      hata.kod === "cakisma" &&
      Array.isArray(hata.ayrinti) &&
      hata.ayrinti.some((sorun: { kod?: string }) => sorun.kod === "stok-ayrildi")
    ) {
      throw new SiparisKurulamadi("stok-yok");
    }
    throw hata;
  }
};
