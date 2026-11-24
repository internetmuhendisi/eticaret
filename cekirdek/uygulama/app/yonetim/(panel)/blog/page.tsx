// Blog ekranı (kart 0272, karar 0176): blogun vitrinde açık olması ve yazıların listesi. Önce sayfanın izni denetlenir,
// sonra listenin durumu adresten tanımla okunur ve liste servisle okunur. Okunamazsa liste hata hâlini gösterir.
import type { Metadata } from "next";
import { calisanSite } from "../../../../../ayar-semasi/calisan-site";
import { hatayiKaydet } from "../../../../../izleme/hata-katmani";
import { siteninServisi } from "../../../../../moduller/magaza-ayarlari/servis";
import { siteninVeritabani } from "../../../../../veritabani/baglanti";
import {
  blogKategorileriAdresi,
  yeniBlogYazisiAdresi,
} from "../../../../../yonetim-paneli/adresler";
import { BlogAyari } from "../../../../../yonetim-paneli/blog/blog-ayari";
import { BlogListesi } from "../../../../../yonetim-paneli/blog/liste";
import { blogListesiTanimi } from "../../../../../yonetim-paneli/blog/liste-tanimi";
import { blogListesiVerisi, blogSuzgecSecenekleri } from "../../../../../yonetim-paneli/blog/veri";
import { EylemBaglantisi } from "../../../../../yonetim-paneli/eylem-dugmesi";
import { listeDurumunuOku } from "../../../../../yonetim-paneli/liste/tanim";
import { panelOturumu } from "../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../yonetim-paneli/panel-sayfasi";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("blog");

export default async function BlogSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await panelSayfasiniAc("blog");
  const durum = listeDurumunuOku(blogListesiTanimi, await searchParams);
  const { yetkili } = await panelOturumu();
  const [veri, secenekler, blogAcik] = await Promise.all([
    blogListesiVerisi(durum, { gorselGorur: yetkili("dosya.gor") }).catch((hata: unknown) => {
      hatayiKaydet(hata, { ekran: "blog" });
      return null;
    }),
    blogSuzgecSecenekleri().catch((hata: unknown) => {
      hatayiKaydet(hata, { ekran: "blog", kaynak: "suzgec-secenekleri" });
      return {};
    }),
    siteninServisi(calisanSite()).tekOku(siteninVeritabani(), "blogAcik"),
  ]);
  return (
    <PanelSayfasi
      kod="blog"
      eylemler={
        <>
          <EylemBaglantisi eylem="blog-kategorileri" href={blogKategorileriAdresi} />
          {yetkili("icerik.degistir") ? (
            <EylemBaglantisi eylem="yazi-ekle" asil href={yeniBlogYazisiAdresi} />
          ) : null}
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <BlogAyari blogAcik={blogAcik} izinli={yetkili("magaza-ayarlari.degistir")} />
        <BlogListesi durum={durum} veri={veri} kayitSecenekleri={secenekler} />
      </div>
    </PanelSayfasi>
  );
}
