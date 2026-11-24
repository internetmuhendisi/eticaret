// Kategori, marka, etiket ve ürün sayfasının ortak iskeleti (kart 0135, karar 0103). Adres dosyaları
// (app/(vitrin)/<tür>/[adresAdi]/page.tsx) yalnız bunu çağırır.
//
// - Adres adı yalnız kayitAdresiniCoz ile kayda çevrilir. Kayıt yoksa sayfa "bulunamadı"dır (notFound).
// - Eski adres kaydın bugünkü adresine kalıcı olarak yönlenir (permanentRedirect, 308). Sorgu kısmı korunur.
// - Çözüm istek başına bir kez yapılır: sayfa bilgisi ve sayfanın kendisi aynı sonucu kullanır (React cache).
// - İskelet sayfa yolunu ve başlığı çizer; sayfanın içeriği children'dır (kartlar 0136, 0138).
import { notFound, permanentRedirect } from "next/navigation";
import { cache, type ReactNode } from "react";
import { SayfaBasligi } from "../../bilesenler/parcalar/sayfa-basligi";
import { SayfaYolu } from "../../bilesenler/parcalar/sayfa-yolu";
import type { AdresliKayitTuru } from "../kayitlar/adres";
import { metin } from "../metinler/site-metni";
import { type AdresliKayit, kayitAdresiniCoz } from "../moduller/gorunurluk/adres";
import { bulunamadiSayfaBilgisi, kayitSayfaBilgisi } from "../moduller/gorunurluk/sayfa-bilgisi";
import { siteninVeritabani } from "../veritabani/baglanti";
import { kayitAdresleri, vitrinAdresleri } from "./adresler";

export type AdresParametreleri = Promise<{ adresAdi: string }>;
export type SorguParametreleri = Promise<Record<string, string | string[] | undefined>>;

// Yönlendirmede korunan sorgu kısmı.
export const sorguMetni = (sorgu: Record<string, string | string[] | undefined>): string => {
  const parametreler = new URLSearchParams();
  for (const [ad, deger] of Object.entries(sorgu)) {
    for (const tek of Array.isArray(deger) ? deger : deger === undefined ? [] : [deger]) {
      parametreler.append(ad, tek);
    }
  }
  const metni = parametreler.toString();
  return metni === "" ? "" : `?${metni}`;
};

const coz = cache((tur: AdresliKayitTuru, adresAdi: string) =>
  kayitAdresiniCoz(siteninVeritabani(), tur, adresAdi),
);

// Sayfanın kaydı; yoksa "bulunamadı", eski adresse yönlendirme (ikisi de çizimi durdurur).
export const sayfaninKaydi = async (
  tur: AdresliKayitTuru,
  parametreler: AdresParametreleri,
  sorgu: SorguParametreleri,
): Promise<AdresliKayit> => {
  const sonuc = await coz(tur, (await parametreler).adresAdi);
  if (sonuc.sonuc === "yok") notFound();
  if (sonuc.sonuc === "yonlendir") {
    permanentRedirect(`${kayitAdresleri[tur](sonuc.adresAdi)}${sorguMetni(await sorgu)}`);
  }
  return sonuc.kayit;
};

// Sayfa bilgisi (generateMetadata) da aynı çözümü kullanır. Kayıt yoksa "bulunamadı" sayfasının bilgisini verir
// (kart 0120): çizimi sayfanın notFound()'u durdurur, sekme başlığı bu bilgiden gelir. Eski adresse yönlendirir.
// yedekAciklama: kaydın kendi açıklaması yoksa kullanılan açıklama (sabit sayfada içeriğin başı, kart 0273).
export const kayitSayfasininBilgisi = async (
  tur: AdresliKayitTuru,
  parametreler: AdresParametreleri,
  sorgu: SorguParametreleri,
  yedekAciklama?: (kayit: AdresliKayit) => Promise<string | null>,
) => {
  const sonuc = await coz(tur, (await parametreler).adresAdi);
  if (sonuc.sonuc === "yok") return bulunamadiSayfaBilgisi();
  const kayit = await sayfaninKaydi(tur, parametreler, sorgu);
  const aciklama = kayit.aciklama ?? (await yedekAciklama?.(kayit)) ?? null;
  return kayitSayfaBilgisi(tur, { ad: kayit.ad, aciklama });
};

export function KayitSayfasi({
  tur,
  kayit,
  ek,
  children,
}: {
  tur: AdresliKayitTuru;
  kayit: AdresliKayit;
  // Başlığın yanındaki soluk yazı, örneğin ürün sayısı (kart 0136).
  ek?: string;
  children?: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-icerik flex-col gap-2 px-4 pt-5 pb-12 tablet:px-6">
      <SayfaYolu
        etiket={metin("ortak.parca.sayfaYolu")}
        ayrac={metin("ortak.parca.sayfaYoluAyraci")}
        adimlar={[
          { ad: metin("vitrin.sayfa.anasayfa"), adres: vitrinAdresleri.anasayfa },
          { ad: kayit.ad, adres: kayitAdresleri[tur](kayit.adresAdi) },
        ]}
      />
      <SayfaBasligi baslik={kayit.ad} {...(ek === undefined ? {} : { ek })} className="mb-5" />
      {children}
    </main>
  );
}
