// Sipariş ayarları ekranı (kart 0234): iptal ve iade (kart 0239), kargo firmaları ve yönetici bildirimleri (kart 0241). Önce sayfanın izni denetlenir, sonra ayar okunur; değişiklik
// tarayıcıdan sipariş ayarları ucuna gider.
import type { Metadata } from "next";
import { panelOturumu } from "../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../yonetim-paneli/panel-sayfasi";
import { SiparisAyarlariEkrani } from "../../../../../yonetim-paneli/siparisler/ayarlar";
import { IptalVeIadeAyarlari } from "../../../../../yonetim-paneli/siparisler/iptal-ve-iade-ayarlari";
import { siparisAyarlariVerisi } from "../../../../../yonetim-paneli/siparisler/veri";
import { YoneticiBildirimleriAyarlari } from "../../../../../yonetim-paneli/siparisler/yonetici-bildirimleri-ayarlari";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("siparis-ayarlari");

export default async function SiparisAyarlariSayfasi() {
  await panelSayfasiniAc("siparis-ayarlari");
  const { yetkili } = await panelOturumu();
  const {
    kargoFirmalari,
    musteriIptali,
    iadeTalebiSuresi,
    iadeKargosu,
    yoneticiBildirimAlicilari,
    kapaliYoneticiBildirimleri,
    gorunenBildirimler,
  } = await siparisAyarlariVerisi();
  const izinli = yetkili("magaza-ayarlari.degistir");
  return (
    <PanelSayfasi kod="siparis-ayarlari">
      <div className="flex flex-col gap-5">
        <IptalVeIadeAyarlari
          baslangic={{ musteriIptali, iadeTalebiSuresi: String(iadeTalebiSuresi), iadeKargosu }}
          izinli={izinli}
        />
        <SiparisAyarlariEkrani firmalar={kargoFirmalari} izinli={izinli} />
        <YoneticiBildirimleriAyarlari
          baslangic={{
            alicilar: yoneticiBildirimAlicilari.join(", "),
            kapalilar: kapaliYoneticiBildirimleri.filter((b) => gorunenBildirimler.includes(b)),
          }}
          gorunenler={gorunenBildirimler}
          izinli={izinli}
        />
      </div>
    </PanelSayfasi>
  );
}
