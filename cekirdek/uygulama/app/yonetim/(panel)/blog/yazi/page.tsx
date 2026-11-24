// Blog yazısının ekranı (kart 0272). Önce sayfanın izni denetlenir, sonra kimlik adresin sorgusundan okunur; kimlik yoksa,
// kalıba uymuyorsa ya da yazı yoksa (silinmişse) bulunamadı. Vitrinde görünen yazıda "Vitrinde gör".
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { calisanSite } from "../../../../../../ayar-semasi/calisan-site";
import { siteninServisi } from "../../../../../../moduller/magaza-ayarlari/servis";
import { siteninVeritabani } from "../../../../../../veritabani/baglanti";
import { kimlikMi } from "../../../../../../veritabani/kimlik";
import { kayitAdresleri } from "../../../../../../vitrin/adresler";
import {
  blogYazisiEkraniVerisi,
  blogYazisiFormVerisi,
} from "../../../../../../yonetim-paneli/blog/veri";
import { BlogYazisiEkrani } from "../../../../../../yonetim-paneli/blog/yazi-ekrani";
import { EylemBaglantisi } from "../../../../../../yonetim-paneli/eylem-dugmesi";
import { panelOturumu } from "../../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../../yonetim-paneli/panel-sayfasi";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("blog-yazisi");

export default async function BlogYazisiSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ kimlik?: string | string[] }>;
}) {
  await panelSayfasiniAc("blog-yazisi");
  const { kimlik } = await searchParams;
  if (typeof kimlik !== "string" || !kimlikMi(kimlik)) notFound();
  const { yetkili } = await panelOturumu();
  const [veri, durum, blogAcik] = await Promise.all([
    blogYazisiEkraniVerisi(kimlik, yetkili),
    blogYazisiFormVerisi(kimlik),
    siteninServisi(calisanSite()).tekOku(siteninVeritabani(), "blogAcik"),
  ]);
  if (veri === undefined || durum === null) notFound();
  return (
    <PanelSayfasi
      kod="blog-yazisi"
      baslik={veri.form.baslik}
      eylemler={
        // Blog kapalıyken yazının sayfası bulunamadı verir: bağlantı yoktur.
        durum.vitrinde && blogAcik ? (
          <EylemBaglantisi
            eylem="vitrinde-gor"
            href={kayitAdresleri["blog-yazisi"](veri.form.adresAdi)}
            target="_blank"
          />
        ) : undefined
      }
    >
      <BlogYazisiEkrani veri={veri} />
    </PanelSayfasi>
  );
}
