// Blog kategorileri (kart 0272): ad ve sıra; yazı sayıları silme onayında söylenir.
import type { Metadata } from "next";
import { BlogKategorileri } from "../../../../../../yonetim-paneli/blog/kategoriler";
import { blogKategorileriVerisi } from "../../../../../../yonetim-paneli/blog/veri";
import { panelOturumu } from "../../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../../yonetim-paneli/panel-sayfasi";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("blog-kategorileri");

export default async function BlogKategorileriSayfasi() {
  await panelSayfasiniAc("blog-kategorileri");
  const { yetkili } = await panelOturumu();
  const kategoriler = await blogKategorileriVerisi();
  return (
    <PanelSayfasi kod="blog-kategorileri">
      <BlogKategorileri
        kategoriler={kategoriler}
        izinler={{ degistir: yetkili("icerik.degistir"), sil: yetkili("icerik.sil") }}
      />
    </PanelSayfasi>
  );
}
