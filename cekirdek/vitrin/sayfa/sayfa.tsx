// Sabit sayfa (kart 0273): /sayfa/<adres adı>, vitrinin çerçevesinde sade metin sayfası (taslak: planlar/tasarim-yonu/
// panel.html, "Vitrin: blog ve sayfa"). Sunucuda çizilir, tarayıcıya kod eklemez. Adres yalnız kayitAdresiniCoz ile
// kayda çevrilir (kayıt sayfalarının ortak yolu, sayfaninKaydi): taslak ve silinmiş sayfa "bulunamadı"dır, eski adres
// bugünkü adrese kalıcı yönlenir (karar 0103).
// İçerik aciklamayiTemizle'den geçmiş biçimli metindir, blog yazısıyla aynı stille (bicimli-metin) çizilir.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { SayfaBasligi } from "../../../bilesenler/parcalar/sayfa-basligi";
import { SayfaYolu } from "../../../bilesenler/parcalar/sayfa-yolu";
import { metin } from "../../metinler/site-metni";
import { vitrinSabitSayfasi } from "../../moduller/icerik/sayfa";
import { aciklamayiTemizle, bicimliMetninDuzYazisi } from "../../moduller/urun/aciklama";
import { siteninVeritabani } from "../../veritabani/baglanti";
import { kayitAdresleri, vitrinAdresleri } from "../adresler";
import type { AdresParametreleri, SorguParametreleri } from "../kayit-sayfasi";
import { kayitSayfasininBilgisi, sayfaninKaydi } from "../kayit-sayfasi";

// Sayfanın içeriği istek başına bir kez (sayfa bilgisi ve sayfa aynı veriyi kullanır); vitrinde değilse null. Adres
// çözümü kayıt sayfalarının ortak yolundandır (sayfaninKaydi): yoksa bulunamadı, eski adresse kalıcı yönlendirme.
const sayfaninIcerigi = cache(async (kimlik: string) => {
  const sayfa = await vitrinSabitSayfasi(siteninVeritabani(), kimlik);
  return sayfa === null ? null : { ...sayfa, icerik: aciklamayiTemizle(sayfa.icerik) };
});

// Açıklama: mağaza sahibinin yazdığı açıklama; yoksa içeriğin düz yazısının başı; içerik de boşsa türün kalıbı.
export const sabitSayfaBilgisi = (
  parametreler: AdresParametreleri,
  sorgu: SorguParametreleri,
): Promise<Metadata> =>
  kayitSayfasininBilgisi("sayfa", parametreler, sorgu, async (kayit) => {
    const icerik = (await sayfaninIcerigi(kayit.kimlik))?.icerik;
    const duz = icerik === undefined ? "" : bicimliMetninDuzYazisi(icerik);
    return duz === "" ? null : duz;
  });

export async function SabitSayfa({
  parametreler,
  sorgu,
}: {
  parametreler: AdresParametreleri;
  sorgu: SorguParametreleri;
}) {
  const kayit = await sayfaninKaydi("sayfa", parametreler, sorgu);
  const sayfa = await sayfaninIcerigi(kayit.kimlik);
  if (sayfa === null) notFound();
  return (
    <main className="mx-auto flex w-full max-w-icerik flex-col px-4 pt-5 pb-12 tablet:px-6">
      <article className="mx-auto flex w-full max-w-metin min-w-0 flex-col gap-4">
        <SayfaYolu
          tekSatir
          etiket={metin("ortak.parca.sayfaYolu")}
          ayrac={metin("ortak.parca.sayfaYoluAyraci")}
          adimlar={[
            { ad: metin("vitrin.sayfa.anasayfa"), adres: vitrinAdresleri.anasayfa },
            { ad: sayfa.baslik, adres: kayitAdresleri.sayfa(sayfa.adresAdi) },
          ]}
        />
        <SayfaBasligi baslik={sayfa.baslik} />
        {sayfa.icerik === undefined ? null : (
          <div
            data-slot="bicimli-metin"
            className="bicimli-metin text-govde wrap-anywhere"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: içerik aciklamayiTemizle'den geçmiştir (karar 0108).
            dangerouslySetInnerHTML={{ __html: sayfa.icerik }}
          />
        )}
      </article>
    </main>
  );
}
