// Arama sayfası (kart 0137; Canlı Çarşı taslağı): /arama?ara=<metin>. Aranan metin ürün adında, markada, kategoride
// ve stok kodunda aranır (cekirdek/moduller/urun/arama.ts); liste, filtre ve sıralama kategori sayfasınınkidir
// (sayfa.tsx), ek sıralama "en uygun" ve varsayılandır.
//
// - Aranan metin yoksa aramayı soran boş hâl.
// - Hiçbir ürün bulunmazsa (filtresiz) "sonuç bulunamadı" ve öneri olarak sitenin üst düzey kategorileri.
// - Sayfa arama motorlarının dizinine hiç girmez (sayfa bilgisi).
// - Arama isteği ara katmanda istek sınırına bağlıdır (proxy.ts, kayitlar/kapi.ts "arama").
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import type { ReactNode } from "react";
import { BosHal } from "../../../bilesenler/parcalar/bos-hal";
import { SayfaBasligi } from "../../../bilesenler/parcalar/sayfa-basligi";
import { SayfaYolu } from "../../../bilesenler/parcalar/sayfa-yolu";
import { aramaSiralamalari } from "../../kayitlar/liste";
import { doldur } from "../../metinler/doldur";
import { metin } from "../../metinler/site-metni";
import { sayfaBasligi } from "../../moduller/gorunurluk/sayfa-bilgisi";
import { kategorileriOku } from "../../moduller/kategori/servis";
import { aramaKosulu, aramaSorgusu, uygunlukPuani } from "../../moduller/urun/arama";
import { siteninVeritabani } from "../../veritabani/baglanti";
import { kayitAdresleri, vitrinAdresleri } from "../adresler";
import { type AdresParametreleri, adrestenDurum } from "./adres";
import { aramaSiniriBasligi } from "./arama-siniri";
import { UrunListesiGorunumu, urunListesiVerisi, urunSayisiYazisi } from "./sayfa";

const arananMetin = (parametreler: AdresParametreleri) =>
  adrestenDurum(parametreler, aramaSiralamalari).arama;

export const aramaSayfaBilgisi = async (parametreler: AdresParametreleri): Promise<Metadata> => {
  const arama = arananMetin(parametreler);
  return {
    title: await sayfaBasligi(
      arama === undefined
        ? metin("vitrin.arama.baslik")
        : doldur(metin("vitrin.arama.sekmeBasligi"), { arama }),
    ),
    robots: { index: false, follow: true },
  };
};

function Iskelet({ baslik, ek, children }: { baslik: string; ek?: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-icerik flex-col gap-2 px-4 pt-5 pb-12 tablet:px-6">
      <SayfaYolu
        etiket={metin("ortak.parca.sayfaYolu")}
        ayrac={metin("ortak.parca.sayfaYoluAyraci")}
        adimlar={[
          { ad: metin("vitrin.sayfa.anasayfa"), adres: vitrinAdresleri.anasayfa },
          { ad: metin("vitrin.arama.baslik"), adres: vitrinAdresleri.arama },
        ]}
      />
      <SayfaBasligi baslik={baslik} {...(ek === undefined ? {} : { ek })} className="mb-5" />
      {children}
    </main>
  );
}

export async function AramaSayfasi({ parametreler }: { parametreler: AdresParametreleri }) {
  // İstek sınırı aşıldıysa ara katman bekleme süresini başlıkla verir; arama yapılmaz.
  const bekle = (await headers()).get(aramaSiniriBasligi);
  if (bekle !== null) {
    return (
      <Iskelet baslik={metin("vitrin.arama.baslik")}>
        <BosHal
          ikon="uyari"
          baslik={metin("vitrin.arama.cokFazlaBaslik")}
          aciklama={doldur(metin("vitrin.arama.cokFazla"), { saniye: bekle })}
        />
      </Iskelet>
    );
  }
  const sorgu = aramaSorgusu(arananMetin(parametreler) ?? "");
  const arama = arananMetin(parametreler);
  if (sorgu === undefined || arama === undefined) {
    return (
      <Iskelet baslik={metin("vitrin.arama.baslik")}>
        <BosHal
          ikon="arama"
          baslik={metin("vitrin.arama.bosSorguBaslik")}
          aciklama={metin("vitrin.arama.bosSorguAciklama")}
        />
      </Iskelet>
    );
  }
  const veri = await urunListesiVerisi({
    kapsam: aramaKosulu(sorgu),
    parametreler,
    arama: { siralamalar: aramaSiralamalari, uygunluk: uygunlukPuani(sorgu) },
  });
  if (veri.liste.kapsamToplami === 0) {
    const kategoriler = (await kategorileriOku(siteninVeritabani())).filter(
      (kategori) => kategori.ust === null,
    );
    return (
      <Iskelet baslik={doldur(metin("vitrin.arama.sonucYokBaslik"), { arama })}>
        <BosHal
          ikon="arama"
          baslik={metin("vitrin.arama.sonucYok")}
          aciklama={metin("vitrin.arama.sonucYokAciklama")}
        />
        {kategoriler.length === 0 ? null : (
          <section aria-labelledby="arama-oneri" className="mt-8 flex flex-col gap-3">
            <h2 id="arama-oneri" className="font-baslik font-baslik-kalinligi text-baslik-3">
              {metin("vitrin.arama.kategoriOnerisi")}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {kategoriler.map((kategori) => (
                <li key={kategori.kimlik}>
                  <Link
                    href={kayitAdresleri.kategori(kategori.adresAdi)}
                    className="inline-flex min-h-11 items-center rounded-dugme border border-kenar bg-yuzey px-4 text-yazi no-underline hover:border-yazi"
                  >
                    {kategori.ad}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </Iskelet>
    );
  }
  return (
    <Iskelet
      baslik={doldur(metin("vitrin.arama.sonucBasligi"), { arama })}
      ek={urunSayisiYazisi(veri)}
    >
      <UrunListesiGorunumu veri={veri} yol={vitrinAdresleri.arama} />
    </Iskelet>
  );
}
