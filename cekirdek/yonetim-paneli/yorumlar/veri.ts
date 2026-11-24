// Yorumlar ekranının verisi (kart 0277, karar 0174): servisin sonucu sitenin biçimiyle yazılır, tarayıcı biçimlemez.
// Liste ucu ve sayfa aynı işlevi çağırır. Sekme sayıları puana ve aramaya uyar; "" bütün yorumlardır (varsayılan
// sekme boşken listenin boş olup olmadığını liste ondan bilir).
import { calisanSite } from "../../ayar-semasi/calisan-site";
import type { YorumDurumu } from "../../kayitlar/yorum";
import { siteninBicimleyicisi } from "../../metinler/site-metni";
import { siteninMagazaAyarlari } from "../../moduller/magaza-ayarlari/servis";
import { yorumPanelListesi } from "../../moduller/yorum/panel-listesi";
import { siteninVeritabani } from "../../veritabani/baglanti";
import type { ListeDurumu, ListeVerisi } from "../liste/tanim";
import { yorumListesiGirdisi } from "./liste-tanimi";

export type YorumSatiri = {
  kimlik: string;
  puan: number;
  // Puanın sitenin biçimiyle yazılışı (ekran okuyucunun okuduğu "5 üzerinden 4").
  puanYazisi: string;
  baslik: string | null;
  metin: string;
  ad: string;
  dogrulanmisAlici: boolean;
  durum: YorumDurumu;
  anaSayfada: boolean;
  zaman: string;
  urun: { kimlik: string; ad: string; adresAdi: string; vitrinde: boolean };
};

export const yorumListesiVerisi = async (durum: ListeDurumu): Promise<ListeVerisi<YorumSatiri>> => {
  const site = calisanSite();
  const b = siteninBicimleyicisi(site.ayarlar);
  const vt = siteninVeritabani();
  const { panelSayfaBoyu } = await siteninMagazaAyarlari(vt, site);
  const liste = await yorumPanelListesi(vt, yorumListesiGirdisi(durum, panelSayfaBoyu));
  return {
    satirlar: liste.satirlar.map((satir) => ({
      kimlik: satir.kimlik,
      puan: satir.puan,
      puanYazisi: b.sayi(satir.puan),
      baslik: satir.baslik,
      metin: satir.metin,
      ad: satir.ad,
      dogrulanmisAlici: satir.dogrulanmisAlici,
      durum: satir.durum,
      anaSayfada: satir.anaSayfada,
      zaman: b.tarihSaat(satir.zaman),
      urun: satir.urun,
    })),
    toplam: liste.toplam,
    sayfa: liste.sayfa,
    sayfaSayisi: liste.sayfaSayisi,
    sayfaBoyu: liste.sayfaBoyu,
    sekmeSayilari: {
      ...liste.durumSayilari,
      "": Object.values(liste.durumSayilari).reduce((a, b) => a + b, 0),
    },
  };
};
