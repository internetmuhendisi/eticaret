// Vergi ekranının verisi (kart 0322): genel ayarlar formun başlangıcıdır; sınıflar sırasıyla, oranları ve bağlı ürün
// sayısıyla gelir. Bölgenin adı (ülke, il, posta kodu) ve oranın yazılışı sunucuda sitenin biçimiyle kurulur; tarayıcı
// biçim kuralı ve bölge listesi taşımaz, oran formunun seçenekleri (satış ülkeleri ve illeri) buradan gider.
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { ilAdi, ilListesiVarMi, ulkeninIlleri } from "../../bolgeler/bolgeler";
import { doldur } from "../../metinler/doldur";
import { metin, siteninBicimleyicisi } from "../../metinler/site-metni";
import type { VergiAyarlari } from "../../moduller/vergi/ayarlar";
import { vergiAyarlariniOku } from "../../moduller/vergi/ayarlar";
import { oranYuzdesi } from "../../moduller/vergi/semalar";
import { siteninVergiServisi } from "../../moduller/vergi/servis";
import { siteninVeritabani } from "../../veritabani/baglanti";

export type VergiOraniSatiri = {
  kimlik: string;
  ulke: string;
  ulkeAdi: string;
  il: string | null;
  ilAdi: string | null;
  postaKodu: string | null;
  // Formdaki yazılış ("7,5") ve satırdaki yazılış ("%7,5 · Türkiye, Ankara").
  oranYazisi: string;
  ad: string;
  ozet: string;
};

export type VergiSinifiSatiri = {
  kimlik: string;
  ad: string;
  kargo: boolean;
  urunSayisi: number;
  oranlar: VergiOraniSatiri[];
};

export type VergiEkraniVerisi = {
  ayarlar: VergiAyarlari;
  // "Vergi adından" seçeneğinin örneği: bugünkü vergi adı ve gösterimle kurulan metin.
  otomatikEkMetin: string;
  siniflar: VergiSinifiSatiri[];
  // Kargonun sınıfı silinmişse (kargo onun oranlarıyla vergilenmeye devam eder, karar 0060) adı: seçim kutusu onu
  // boş göstermesin.
  silinmisKargoSinifi: { kimlik: string; ad: string } | null;
  // Oran formunun ülkeleri (sitenin satış ülkeleri) ve il listesi olan ülkelerin illeri.
  ulkeler: { kod: string; ad: string; iller: { kod: string; ad: string }[] }[];
};

export const vergiEkraniVerisi = async (): Promise<VergiEkraniVerisi> => {
  const site = calisanSite();
  const vt = siteninVeritabani();
  const bicim = siteninBicimleyicisi(site.ayarlar);
  const servis = siteninVergiServisi(site);
  const [ayarlar, butunTablo, urunSayilari] = await Promise.all([
    vergiAyarlariniOku(vt, site),
    servis.tabloyuOku(vt, { silinmisSiniflar: true }),
    servis.sinifUrunSayilari(vt),
  ]);
  const tablo = butunTablo.filter((sinif) => !sinif.silindi);
  const silinmisKargo = butunTablo.find((sinif) => sinif.silindi && sinif.kargo);
  const yuzdeYazisi = (oran: number) => {
    const yuzde = oranYuzdesi(oran);
    const ondalik = yuzde.includes(".") ? (yuzde.split(".")[1]?.length ?? 0) : 0;
    return bicim.sayi(oran / 10_000, ondalik);
  };
  const bolgeYazisi = (oran: { ulke: string; il?: string; postaKodu?: string }) =>
    [
      bicim.ulkeAdi(oran.ulke),
      oran.il === undefined ? undefined : (ilAdi(oran.il) ?? oran.il),
      oran.postaKodu,
    ]
      .filter((parca) => parca !== undefined)
      .join(metin("yonetim.kategori.ayrac"));
  const dahil = ayarlar.fiyatGosterimi === "vergi-dahil";
  return {
    ayarlar,
    otomatikEkMetin:
      ayarlar.vergiAdi === ""
        ? metin(dahil ? "vitrin.fiyat.vergilerDahil" : "vitrin.fiyat.vergilerHaric")
        : doldur(metin(dahil ? "vitrin.fiyat.vergiDahil" : "vitrin.fiyat.vergiHaric"), {
            vergi: ayarlar.vergiAdi,
          }),
    silinmisKargoSinifi:
      silinmisKargo === undefined ? null : { kimlik: silinmisKargo.kimlik, ad: silinmisKargo.ad },
    siniflar: tablo.map((sinif) => ({
      kimlik: sinif.kimlik,
      ad: sinif.ad,
      kargo: sinif.kargo,
      urunSayisi: urunSayilari.get(sinif.kimlik) ?? 0,
      oranlar: sinif.oranlar.map((oran) => {
        const oranYazisi = yuzdeYazisi(oran.oran);
        return {
          kimlik: oran.kimlik,
          ulke: oran.ulke,
          ulkeAdi: bicim.ulkeAdi(oran.ulke),
          il: oran.il ?? null,
          ilAdi: oran.il === undefined ? null : (ilAdi(oran.il) ?? oran.il),
          postaKodu: oran.postaKodu ?? null,
          oranYazisi,
          ad: oran.ad ?? "",
          ozet: doldur(metin("yonetim.vergi.oranOzeti"), {
            oran: oranYazisi,
            bolge: bolgeYazisi(oran),
          }),
        };
      }),
    })),
    ulkeler: site.ayarlar.teslimatUlkeleri.map((kod) => ({
      kod,
      ad: bicim.ulkeAdi(kod),
      iller: ilListesiVarMi(kod)
        ? ulkeninIlleri(kod).map((il) => ({ kod: il.kod, ad: il.ad }))
        : [],
    })),
  };
};
