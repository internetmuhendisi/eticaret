// Sepet sayfası (kart 0212, karar 0135; kart 0211'in taslağı): /sepet. Sepet tarayıcıdadır: sayfa sunucuda çerçeveyi
// (sayfa yolu, başlık) çizer, satırlar ve özet tarayıcıda sepet ucunun hesabıyla çizilir (sepet-gorunumu.tsx).
// Kişiye özel sayfa: arama motorlarına kapalıdır.
import type { Metadata } from "next";
import { SayfaBasligi } from "../../../bilesenler/parcalar/sayfa-basligi";
import { SayfaYolu } from "../../../bilesenler/parcalar/sayfa-yolu";
import { metin } from "../../metinler/site-metni";
import { sayfaBasligi } from "../../moduller/gorunurluk/sayfa-bilgisi";
import { vitrinAdresleri } from "../adresler";
import { SepetSayfasiIcerigi } from "./sepet-gorunumu";

export const sepetSayfaBilgisi = async (): Promise<Metadata> => ({
  title: await sayfaBasligi(metin("vitrin.sepet.sayfaBasligi")),
  robots: { index: false, follow: false },
});

export function SepetSayfasi() {
  return (
    <main className="mx-auto flex w-full max-w-icerik flex-col gap-2 px-4 pt-5 pb-12 tablet:px-6">
      <SayfaYolu
        etiket={metin("ortak.parca.sayfaYolu")}
        ayrac={metin("ortak.parca.sayfaYoluAyraci")}
        adimlar={[
          { ad: metin("vitrin.sayfa.anasayfa"), adres: vitrinAdresleri.anasayfa },
          { ad: metin("vitrin.sepet.sayfaBasligi"), adres: vitrinAdresleri.sepet },
        ]}
      />
      <SayfaBasligi baslik={metin("vitrin.sepet.baslik")} className="mb-3" />
      <SepetSayfasiIcerigi />
    </main>
  );
}
