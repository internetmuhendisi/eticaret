// Girişli panel sayfalarının düzeni ve çerçevesi (kart 0141). Asıl kontrol ara katmandadır (proxy.ts); bu ikinci
// katmandır, adres eşleşmesi bir gün yanılsa bile panel açılmaz. Anahtarı değiştirmeden sorar (panelOturumu,
// oturumAcikMi ile aynı kural): sayfa çizerken çerez yazılamaz (karar 0039, 0042). Menü sayfa ağacından ve
// yöneticinin sunucudan okunan izinlerinden kurulur; izni olmayan sayfa menüde görünmez.
import type { ReactNode } from "react";
import { altyapiAdi } from "../../../../kayitlar/altyapi";
import { metin } from "../../../../metinler/site-metni";
import { logonunYolu, magazaLogosu } from "../../../../moduller/magaza-ayarlari/logo";
import { magazaninAdi } from "../../../../moduller/magaza-ayarlari/servis";
import { siteninVeritabani } from "../../../../veritabani/baglanti";
import { PanelCercevesi } from "../../../../yonetim-paneli/panel-cercevesi";
import { panelOturumu } from "../../../../yonetim-paneli/panel-oturumu";
import { menuyuKur, panelGruplari, panelSayfalari } from "../../../../yonetim-paneli/sayfa-agaci";

export default async function PanelDuzeni({ children }: { children: ReactNode }) {
  const { eposta, yetkili } = await panelOturumu();
  const vt = siteninVeritabani();
  const [ad, logo] = await Promise.all([magazaninAdi(vt), magazaLogosu(vt)]);
  const gruplar = menuyuKur(panelSayfalari, yetkili).map(({ grup, sayfalar }) => ({
    kod: grup ?? "",
    ad: grup === null ? null : metin(panelGruplari[grup]),
    sayfalar: sayfalar.map(({ isaret, ...sayfa }) => ({
      ...sayfa,
      ad: metin(sayfa.ad),
      ...(isaret === undefined ? {} : { isaret: metin(isaret) }),
    })),
  }));
  return (
    <PanelCercevesi
      magaza={{
        ad,
        ...(logo === undefined ? {} : { logoAdresi: logonunYolu(logo) }),
      }}
      eposta={eposta}
      gruplar={gruplar}
      altyapiAdi={altyapiAdi}
    >
      {children}
    </PanelCercevesi>
  );
}
