// Favoriler sayfası (kart 0140, karar 0110; Canlı Çarşı taslağı): /favoriler.
//
// Sayfa çizilirken müşterinin oturumu okunmaz (karar 0039). Tarayıcı geçerli listeyi yalnız bu yola giden çerezle
// verir (favori-deposu.ts); kartlar burada, ürün kartının tek veri işleviyle çizilir (urunKartlari, sayfa yeri:
// gizli ve tükenmiş ürün görünür, taslak, arşiv ve silinmiş ürün görünmez). Hangi kartların gösterileceğine
// tarayıcıdaki favori durumu karar verir (favori-listesi.tsx): çerezde olmayan ürün varsa sayfa yenilenir.
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Baglanti } from "../../bilesenler/parcalar/baglanti";
import { BosHal } from "../../bilesenler/parcalar/bos-hal";
import { SayfaYolu } from "../../bilesenler/parcalar/sayfa-yolu";
import { Uyari } from "../../bilesenler/parcalar/uyari";
import { calisanSite } from "../ayar-semasi/calisan-site";
import { favoriCerezi } from "../kayitlar/favori";
import { yazilanIslevler } from "../kayitlar/islevler";
import { metin } from "../metinler/site-metni";
import { sayfaBasligi } from "../moduller/gorunurluk/sayfa-bilgisi";
import { siteninGecerliTemasi } from "../moduller/tema/servis";
import { siteninVeritabani } from "../veritabani/baglanti";
import { girisAdresiDonuslu, vitrinAdresleri } from "./adresler";
import { izgaraSiniflari } from "./bolumler/ortak/urun-izgarasi";
import { cerezMetniniOku } from "./favori-deposu";
import { FavoriListesi } from "./favori-listesi";
import { urunKartiGorunumu } from "./urun-karti/gorunum";
import { oncelikliKartSayisi, UrunKarti } from "./urun-karti/urun-karti";
import { urunKartlari } from "./urun-karti/veri";

// Kişiye özel sayfa: arama motorlarına kapalıdır.
export const favorilerSayfaBilgisi = async (): Promise<Metadata> => ({
  title: await sayfaBasligi(metin("vitrin.favori.baslik")),
  robots: { index: false, follow: false },
});

export async function FavorilerSayfasi() {
  const denetlenenler = cerezMetniniOku((await cookies()).get(favoriCerezi.ad)?.value);
  const vt = siteninVeritabani();
  const [kartlar, tema] = await Promise.all([
    urunKartlari(vt, calisanSite(), denetlenenler, { yer: "sayfa" }),
    siteninGecerliTemasi(vt),
  ]);
  const gorunum = urunKartiGorunumu(tema.tema.tanim.gorunumler);
  return (
    <main className="mx-auto flex w-full max-w-icerik flex-col gap-2 px-4 pt-5 pb-12 tablet:px-6">
      <SayfaYolu
        etiket={metin("ortak.parca.sayfaYolu")}
        ayrac={metin("ortak.parca.sayfaYoluAyraci")}
        adimlar={[
          { ad: metin("vitrin.sayfa.anasayfa"), adres: vitrinAdresleri.anasayfa },
          { ad: metin("vitrin.favori.baslik"), adres: vitrinAdresleri.favoriler },
        ]}
      />
      <FavoriListesi
        baslik={metin("vitrin.favori.baslik")}
        denetlenenler={denetlenenler}
        kartlar={kartlar.map((urun, sira) => ({
          kimlik: urun.kimlik,
          kart: (
            <UrunKarti
              urun={urun}
              gorunum={gorunum}
              islevler={yazilanIslevler}
              baslikDuzeyi={2}
              oncelikli={sira < oncelikliKartSayisi}
              className="h-full"
            />
          ),
        }))}
        izgara={izgaraSiniflari(gorunum, "tam")}
        cihazdaBilgisi={
          <Uyari tur="bilgi" className="mb-3">
            {/* Bağlantı dokunma alanı için 44 px yüksektir: yazı onunla ortada hizalanır. */}
            <span className="flex flex-wrap items-center gap-x-4">
              {metin("vitrin.favori.cihazda")}
              <Baglanti href={girisAdresiDonuslu(vitrinAdresleri.favoriler)} className="font-kalin">
                {metin("vitrin.favori.girisBaglantisi")}
              </Baglanti>
            </span>
          </Uyari>
        }
        bosHal={
          <BosHal
            ikon="favori"
            baslik={metin("vitrin.favori.bosBaslik")}
            aciklama={metin("vitrin.favori.bosAciklama")}
          >
            <Baglanti href={vitrinAdresleri.anasayfa} gorunum="birincil">
              {metin("vitrin.favori.alisveriseBasla")}
            </Baglanti>
          </BosHal>
        }
      />
    </main>
  );
}
