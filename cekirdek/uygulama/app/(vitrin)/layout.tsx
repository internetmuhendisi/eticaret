// Vitrin sayfalarının çerçevesi (kart 0108, karar 0083): üst kısım ve alt kısım düzenden çizilir. Adresler
// değişmez, (vitrin) yalnız klasör grubudur; panel (yonetim/) ve geliştirme sayfaları bu çerçevenin dışındadır.
//
// Düzen ve bağlam istek başına bir kez okunur. Okunamazsa (veritabanı kapalı) sayfa üst ve alt kısım olmadan
// açılır, hata kaydedilir: sayfanın kendisi çerçeve yüzünden düşmez.
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { calisanSite } from "../../../ayar-semasi/calisan-site";
import { hatayiKaydet } from "../../../izleme/hata-katmani";
import { duzenServisi } from "../../../moduller/duzen/servis";
import { vitrinSayfaKalibi } from "../../../moduller/gorunurluk/sayfa-bilgisi";
import { siteninMagazaAyarlari } from "../../../moduller/magaza-ayarlari/servis";
import { siteninVeritabani } from "../../../veritabani/baglanti";
import { vitrinBaglaminiOku } from "../../../vitrin/baglam-oku";
import { bolumGorunumleri } from "../../../vitrin/bolum-kutuphanesi/gorunumler";
import { bolumKutuphanesi } from "../../../vitrin/bolum-kutuphanesi/kutuphane";
import { VitrinBildirimleri } from "../../../vitrin/favori-dugmesi";
import { FavoriSaglayici } from "../../../vitrin/favori-durumu";
import { SepetSaglayici } from "../../../vitrin/sepet/durum";
import { SepetPenceresi } from "../../../vitrin/sepet/sepet-penceresi";
import { TemaDemosuSeridi } from "../../../vitrin/tema-demosu-seridi";
import { vitrinTemasi } from "../../../vitrin/tema-secimi";
import { AltKisim, UstKisim } from "../../../vitrin/ust-alt-kisim";
import { VitrinBilgisiSaglayici } from "../../../vitrin/vitrin-bilgisi";

// Varsayılan sekme başlığı (mağaza adı) ve açıklama (kart 0135, karar 0103). Sayfa kendi başlığını
// sayfaBasligi ile "<sayfa> | <mağaza adı>" kalıbında verir; vermeyen sayfa (ana sayfa) mağaza adını alır.
export const generateMetadata = (): Promise<Metadata> => vitrinSayfaKalibi();

const cerceveyiOku = async () => {
  try {
    const vt = siteninVeritabani();
    const servis = duzenServisi(calisanSite);
    const [ust, alt] = await Promise.all([
      servis.cizilecekBolumler(vt, "ust-kisim"),
      servis.cizilecekBolumler(vt, "alt-kisim"),
    ]);
    const [baglam, ayarlar] = await Promise.all([
      vitrinBaglaminiOku(vt, calisanSite(), [...ust, ...alt], bolumKutuphanesi),
      siteninMagazaAyarlari(vt, calisanSite()),
    ]);
    return { ust, alt, baglam, sepeteEkleyince: ayarlar.sepeteEkleyince };
  } catch (hata) {
    hatayiKaydet(hata, { kaynak: "vitrin-cercevesi" });
    return undefined;
  }
};

// Tema demosunun şeridi (kart 0116): yalnız tema demosu ayarı açık sitede, seçili temayla. Okunamazsa şerit çizilmez,
// hata kaydedilir.
const demoSeridi = async () => {
  const site = calisanSite();
  if (!site.ayarlar.temaDemosu) return null;
  try {
    const { tema } = await vitrinTemasi(siteninVeritabani(), site);
    return <TemaDemosuSeridi temalar={site.temalar} secili={tema.kod} />;
  } catch (hata) {
    hatayiKaydet(hata, { kaynak: "tema-demosu" });
    return null;
  }
};

export default async function VitrinCercevesi({ children }: { children: ReactNode }) {
  const [cerceve, serit] = await Promise.all([cerceveyiOku(), demoSeridi()]);
  // Favori düğmeleri, sayısı ve favoriler sayfası durumu tarayıcıda paylaşır (kart 0140, karar 0110). Sepet de öyle
  // (kart 0212, karar 0135): sepete ekle düğmeleri, sayı, sepet penceresi ve sepet sayfası; çerçeve okunamazsa ürün
  // eklenince sepet penceresi açılır (ayarın varsayılanı).
  return (
    <FavoriSaglayici ayarlar={{ kip: "sorulur", sinir: calisanSite().ayarlar.favoriSiniri }}>
      <SepetSaglayici
        ayarlar={{ kip: "sorulur", sepeteEkleyince: cerceve?.sepeteEkleyince ?? "yan-pencere" }}
      >
        <div className="flex min-h-dvh flex-col">
          {serit}
          {cerceve === undefined ? null : (
            <UstKisim
              bolumler={cerceve.ust}
              gorunumler={bolumGorunumleri}
              baglam={cerceve.baglam}
            />
          )}
          {/* Hata sayfası (error.tsx, kart 0120) mağaza adını ve telefonu buradan alır. */}
          <VitrinBilgisiSaglayici
            bilgi={
              cerceve === undefined
                ? {}
                : {
                    magazaAdi: cerceve.baglam.magazaAdi,
                    ...(cerceve.baglam.iletisim.telefon === undefined
                      ? {}
                      : { telefon: cerceve.baglam.iletisim.telefon.metin }),
                  }
            }
          >
            <div className="flex-1">{children}</div>
          </VitrinBilgisiSaglayici>
          {cerceve === undefined ? null : (
            <AltKisim
              bolumler={cerceve.alt}
              gorunumler={bolumGorunumleri}
              baglam={cerceve.baglam}
            />
          )}
        </div>
        <SepetPenceresi />
        <VitrinBildirimleri />
      </SepetSaglayici>
    </FavoriSaglayici>
  );
}
