// Sabit sayfa (kart 0273): /sayfa/<adres adı>, vitrinin çerçevesinde sade metin sayfası (taslak: planlar/tasarim-yonu/
// panel.html, "Vitrin: blog ve sayfa"). Sunucuda çizilir, tarayıcıya kod eklemez. Adres yalnız kayitAdresiniCoz ile
// kayda çevrilir: taslak ve silinmiş sayfa "bulunamadı"dır, eski adres bugünkü adrese kalıcı yönlenir (karar 0103).
// İçerik aciklamayiTemizle'den geçmiş biçimli metindir, blog yazısıyla aynı stille (bicimli-metin) çizilir.
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { SayfaBasligi } from "../../../bilesenler/parcalar/sayfa-basligi";
import { SayfaYolu } from "../../../bilesenler/parcalar/sayfa-yolu";
import { metin } from "../../metinler/site-metni";
import { kayitAdresiniCoz } from "../../moduller/gorunurluk/adres";
import { bulunamadiSayfaBilgisi, kayitSayfaBilgisi } from "../../moduller/gorunurluk/sayfa-bilgisi";
import { vitrinSabitSayfasi } from "../../moduller/icerik/sayfa";
import { aciklamayiTemizle, bicimliMetninDuzYazisi } from "../../moduller/urun/aciklama";
import { siteninVeritabani } from "../../veritabani/baglanti";
import { kayitAdresleri, vitrinAdresleri } from "../adresler";
import type { AdresParametreleri, SorguParametreleri } from "../kayit-sayfasi";
import { sorguMetni } from "../kayit-sayfasi";

// Adres adının çözümü ve sayfanın verisi istek başına bir kez (sayfa bilgisi ve sayfa aynı sonucu kullanır).
const sayfaCozumu = cache(async (adresAdi: string) => {
  const vt = siteninVeritabani();
  const sonuc = await kayitAdresiniCoz(vt, "sayfa", adresAdi);
  if (sonuc.sonuc !== "kayit") return sonuc;
  const sayfa = await vitrinSabitSayfasi(vt, sonuc.kayit.kimlik);
  return sayfa === null
    ? { sonuc: "yok" as const }
    : {
        sonuc: "kayit" as const,
        kayit: sonuc.kayit,
        sayfa: { ...sayfa, icerik: aciklamayiTemizle(sayfa.icerik) },
      };
});

const cozulmusSayfa = async (parametreler: AdresParametreleri, sorgu: SorguParametreleri) => {
  const sonuc = await sayfaCozumu((await parametreler).adresAdi);
  if (sonuc.sonuc === "yok") notFound();
  if (sonuc.sonuc === "yonlendir") {
    permanentRedirect(`${kayitAdresleri.sayfa(sonuc.adresAdi)}${sorguMetni(await sorgu)}`);
  }
  return sonuc;
};

// Açıklama: mağaza sahibinin yazdığı açıklama; yoksa içeriğin başı; içerik de boşsa türün kalıbı.
export const sabitSayfaBilgisi = async (
  parametreler: AdresParametreleri,
  sorgu: SorguParametreleri,
): Promise<Metadata> => {
  const sonuc = await sayfaCozumu((await parametreler).adresAdi);
  if (sonuc.sonuc === "yok") return bulunamadiSayfaBilgisi();
  const { kayit, sayfa } = await cozulmusSayfa(parametreler, sorgu);
  const icerikten = sayfa.icerik === undefined ? "" : bicimliMetninDuzYazisi(sayfa.icerik);
  return kayitSayfaBilgisi("sayfa", {
    ad: kayit.ad,
    aciklama: kayit.aciklama ?? (icerikten === "" ? null : icerikten),
  });
};

export async function SabitSayfa({
  parametreler,
  sorgu,
}: {
  parametreler: AdresParametreleri;
  sorgu: SorguParametreleri;
}) {
  const { sayfa } = await cozulmusSayfa(parametreler, sorgu);
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
