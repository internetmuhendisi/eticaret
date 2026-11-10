// Blog yazılarının görünüşü (kart 0112; Canlı Çarşı taslağının "Blogdan" bölümü). Her yazıda 16:10 görsel, tarih,
// başlık, iki satırda kesilen özet ve "Devamını oku". Başlığın bağlantısı kartın tamamına yayılır; "Devamını oku"
// bağlantı değil, görünüştür (aynı adrese iki bağlantı olmaz). Yazılar bağlamdaki kaynaktan gelir
// (islev-verisi.ts); yazısı olmayan bölüm çizilmez.
import Link from "next/link";
import { useId } from "react";
import {
  Serit,
  SeritDugmeleri,
  SeritIcerigi,
  SeritOgesi,
} from "../../../../bilesenler/parcalar/serit";
import { metin } from "../../../metinler/site-metni";
import { BolumGorseli } from "../../bolum-kutuphanesi/gorsel";
import type { BolumGorunumuOzellikleri } from "../../bolum-kutuphanesi/gorunumler";
import {
  type BaglamBlogYazisi,
  type BlogKaynagi,
  blogKaynagiAnahtari,
} from "../../bolum-kutuphanesi/islev-verisi";
import { secimDegeri } from "../../bolum-kutuphanesi/tarif";
import { metinMi } from "../ortak/deger";
import { kartBaglantisi } from "../ortak/kart-baglantisi";
import { BolumBasligi } from "../ortak/urun-izgarasi";
import { blogAdetleri, blogYazilari } from "./tarif";

export function BlogYazilariGorunumu({ gorunum, degerler: ham, baglam }: BolumGorunumuOzellikleri) {
  const baslikKimligi = useId();
  // Değerler tarifin şemasından geçmiştir (kart 0106); türleri tarifteki alanlardır.
  const degerler = ham as Partial<
    Record<"baslik" | "kategori" | "adet" | "tumuBaglantisi", unknown>
  >;
  const adet =
    blogAdetleri[
      secimDegeri(blogYazilari.alanlar.adet, degerler.adet) as keyof typeof blogAdetleri
    ];
  const kaynak: BlogKaynagi = metinMi(degerler.kategori)
    ? { tur: "kategori", kategori: degerler.kategori, adet }
    : { tur: "son", adet };
  const yazilar = (baglam.blogYazilari[blogKaynagiAnahtari(kaynak)] ?? []).slice(0, adet);
  if (yazilar.length === 0) return null;
  const baslik = metinMi(degerler.baslik) ? degerler.baslik : undefined;
  const etiket = baslik ?? metin("vitrin.bolum.blogYazilari.etiket");
  const kart = (yazi: BaglamBlogYazisi) => (
    <article className="relative flex h-full min-w-0 flex-col gap-2">
      <div className="flex aspect-16/10 items-center justify-center overflow-hidden rounded-orta bg-yuzey">
        <BolumGorseli
          baglam={baglam}
          gorsel={yazi.gorsel}
          genislik="ucteBir"
          className="size-full object-cover"
        />
      </div>
      <time dateTime={yazi.tarih.makine} className="text-kucuk text-soluk-yazi">
        {yazi.tarih.yazili}
      </time>
      <h3 className="font-baslik text-buyuk font-baslik-kalinligi wrap-anywhere">
        <Link href={yazi.adres} className={kartBaglantisi}>
          {yazi.baslik}
        </Link>
      </h3>
      {yazi.ozet === undefined ? null : <p className="line-clamp-2 text-soluk-yazi">{yazi.ozet}</p>}
      <span aria-hidden="true" className="mt-auto font-kalin text-yazi underline">
        {metin("vitrin.bolum.blogYazilari.devami")}
      </span>
    </article>
  );
  return (
    <section
      {...(baslik === undefined ? { "aria-label": etiket } : { "aria-labelledby": baslikKimligi })}
      className="mx-auto flex w-full max-w-icerik flex-col gap-4 px-4 tablet:px-6"
    >
      <BolumBasligi kimlik={baslikKimligi} baslik={baslik} tumu={degerler.tumuBaglantisi} />
      {gorunum === "kaydirmali" ? (
        <Serit
          metinler={{
            etiket,
            seritTanimi: metin("ortak.parca.seritTanimi"),
            ogeTanimi: metin("ortak.parca.seritOgesi"),
            onceki: metin("ortak.parca.onceki"),
            sonraki: metin("ortak.parca.sonraki"),
          }}
        >
          <SeritIcerigi>
            {yazilar.map((yazi) => (
              <SeritOgesi
                key={yazi.kimlik}
                className="basis-5/6 tablet:basis-1/2 masaustu:basis-1/3"
              >
                {kart(yazi)}
              </SeritOgesi>
            ))}
          </SeritIcerigi>
          <SeritDugmeleri />
        </Serit>
      ) : (
        <ul className="grid grid-cols-1 gap-6 tablet:grid-cols-2 masaustu:grid-cols-3">
          {yazilar.map((yazi) => (
            <li key={yazi.kimlik} className="min-w-0">
              {kart(yazi)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
