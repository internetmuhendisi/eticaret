// Banka hesapları ekranı (kart 0214). Önce sayfanın izni denetlenir (izni olmayana bulunamadı), sonra hesaplar
// okunur; değişiklikler tarayıcıdan banka hesabı uçlarına gider.
import type { Metadata } from "next";
import {
  BankaHesaplariEylemleri,
  BankaHesaplariIcerigi,
  BankaHesaplariSaglayici,
} from "../../../../../yonetim-paneli/odeme-yontemleri/banka-hesaplari";
import { bankaHesaplariEkraniVerisi } from "../../../../../yonetim-paneli/odeme-yontemleri/veri";
import { panelOturumu } from "../../../../../yonetim-paneli/panel-oturumu";
import {
  PanelSayfasi,
  panelSayfaBilgisi,
  panelSayfasiniAc,
} from "../../../../../yonetim-paneli/panel-sayfasi";

export const generateMetadata = (): Promise<Metadata> => panelSayfaBilgisi("banka-hesaplari");

export default async function BankaHesaplariSayfasi() {
  await panelSayfasiniAc("banka-hesaplari");
  const { yetkili } = await panelOturumu();
  const degistirebilir = yetkili("odeme-yontemi.degistir");
  const hesaplar = await bankaHesaplariEkraniVerisi();
  return (
    <BankaHesaplariSaglayici hesaplar={hesaplar} degistirebilir={degistirebilir}>
      <PanelSayfasi
        kod="banka-hesaplari"
        {...(degistirebilir ? { eylemler: <BankaHesaplariEylemleri /> } : {})}
      >
        <BankaHesaplariIcerigi />
      </PanelSayfasi>
    </BankaHesaplariSaglayici>
  );
}
