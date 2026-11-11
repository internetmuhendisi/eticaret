// Vitrinin "bulunamadı" sayfası (kart 0120, karar 0102; Canlı Çarşı taslağı). Vitrin çerçevesinin içinde çizilir
// (app/(vitrin)/not-found.tsx): üst ve alt kısım görünür, müşteri menüye ve ana sayfaya dönebilir. Durum kodu 404,
// sayfa arama motorlarına kapalıdır (Next.js `noindex` yazar).
//
// - Altında sitenin üst düzey kategorileri kategori kutuları bölümünün ızgara görünümüyle çizilir: kutu, görsel,
//   renk ve bağlantı o bölümün tek kodundan, veri vitrin bağlamından gelir. Kategori yoksa ya da okunamazsa
//   (hata kaydedilir) yalnız üst kısım görünür; sayfa düşmez.
// - Taslaktaki arama kutusu arama işlevi açıkken görünür (kart 0137).
import { Baglanti } from "../../bilesenler/parcalar/baglanti";
import { calisanSite } from "../ayar-semasi/calisan-site";
import { hatayiKaydet } from "../izleme/hata-katmani";
import { yazilanIslevler } from "../kayitlar/islevler";
import { metin } from "../metinler/site-metni";
import { kategorileriOku } from "../moduller/kategori/servis";
import { siteninVeritabani } from "../veritabani/baglanti";
import { vitrinAdresleri } from "./adresler";
import { AramaKutusu } from "./arama-kutusu";
import { vitrinBaglaminiOku } from "./baglam-oku";
import type { BolumOrnegi } from "./bolum-kutuphanesi/duzen";
import { bolumGorunumleri } from "./bolum-kutuphanesi/gorunumler";
import { bolumKutuphanesi } from "./bolum-kutuphanesi/kutuphane";
import { kategoriKutulari } from "./bolumler/kategori-kutulari/tarif";
import { DurumSayfasi } from "./durum-sayfasi";
import { DuzenAlaniCizimi } from "./duzen-alani";

// Düzende olmayan, yalnız bu sayfada çizilen bölümün kimliği.
const kategoriBolumuKimligi = "bulunamadi-kategorileri";

// Üst düzey kategoriler, kardeş sırasıyla, bölümün liste sınırı kadar.
export const bulunamadiKategorileri = async () => {
  try {
    const vt = siteninVeritabani();
    const ustler = (await kategorileriOku(vt))
      .filter((kategori) => kategori.ust === null)
      .slice(0, kategoriKutulari.alanlar.kategoriler.enCok);
    if (ustler.length === 0) return undefined;
    const bolum: BolumOrnegi = {
      kimlik: kategoriBolumuKimligi,
      tur: kategoriKutulari.tur,
      gorunum: "izgara",
      gizli: false,
      degerler: {
        baslik: metin("vitrin.bulunamadi.kategoriler"),
        kategoriler: ustler.map((kategori) => ({ kategori: kategori.kimlik })),
      },
    };
    return {
      bolum,
      baglam: await vitrinBaglaminiOku(vt, calisanSite(), [bolum], bolumKutuphanesi),
    };
  } catch (hata) {
    hatayiKaydet(hata, { kaynak: "bulunamadi-sayfasi" });
    return undefined;
  }
};

export async function BulunamadiSayfasi() {
  const kategoriler = await bulunamadiKategorileri();
  return (
    <main className="flex w-full flex-col gap-8 pb-12">
      <DurumSayfasi
        isaret={
          // Taslakta ana renktedir; ana renk zeminde büyük yazı için de okunmaz (Canlı Çarşı'da 2,1:1, tarama
          // yakaladı), bu yüzden yazı rengindedir.
          <span className="font-baslik font-baslik-kalinligi text-afis-basligi text-yazi">
            {metin("vitrin.bulunamadi.kod")}
          </span>
        }
        baslik={metin("vitrin.bulunamadi.baslik")}
        aciklama={metin("vitrin.bulunamadi.aciklama")}
      >
        {yazilanIslevler.arama ? (
          <AramaKutusu
            className="w-full"
            metinler={{
              etiket: metin("vitrin.bolum.ustSatir.aramaEtiketi"),
              yerTutucu: metin("vitrin.bolum.ustSatir.aramaYerTutucu"),
              dugme: metin("vitrin.bolum.ustSatir.arama"),
            }}
          />
        ) : null}
        <Baglanti href={vitrinAdresleri.anasayfa} gorunum="ikincil">
          {metin("vitrin.bulunamadi.anasayfayaDon")}
        </Baglanti>
      </DurumSayfasi>
      {kategoriler === undefined ? null : (
        <DuzenAlaniCizimi
          bolumler={[kategoriler.bolum]}
          gorunumler={bolumGorunumleri}
          baglam={kategoriler.baglam}
        />
      )}
    </main>
  );
}
