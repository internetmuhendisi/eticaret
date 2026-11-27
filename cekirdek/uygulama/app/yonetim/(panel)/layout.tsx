// Girişli panel sayfalarının düzeni ve çerçevesi (kart 0141). Asıl kontrol ara katmandadır (proxy.ts); bu ikinci
// katmandır, adres eşleşmesi bir gün yanılsa bile panel açılmaz. Anahtarı değiştirmeden sorar (panelOturumu,
// oturumAcikMi ile aynı kural): sayfa çizerken çerez yazılamaz (karar 0039, 0042). Menü sayfa ağacından ve
// yöneticinin sunucudan okunan izinlerinden kurulur; izni olmayan sayfa menüde görünmez. Menüdeki sayılar (onay
// bekleyen yorum, kart 0277) yalnız görünen sayfalar için istek başına okunur; panelin işlemleri sayfayı
// yenilediğinden (router.refresh) sayı işlemden sonra güncellenir.
import type { ReactNode } from "react";
import { calisanSite } from "../../../../ayar-semasi/calisan-site";
import { eklentiAcikMi } from "../../../../eklentiler/acik";
import { altyapiAdi } from "../../../../kayitlar/altyapi";
import { panelAramaTurKodlari, panelAramaTurleri } from "../../../../kayitlar/panel-arama";
import { doldur } from "../../../../metinler/doldur";
import { bicim, metin } from "../../../../metinler/site-metni";
import { logonunYolu, magazaLogosu } from "../../../../moduller/magaza-ayarlari/logo";
import { magazaninAdi } from "../../../../moduller/magaza-ayarlari/servis";
import { siteninVeritabani } from "../../../../veritabani/baglanti";
import { menuSayaciTanimlari, menuSayilariniOku } from "../../../../yonetim-paneli/menu-sayaclari";
import { PanelCercevesi } from "../../../../yonetim-paneli/panel-cercevesi";
import { panelOturumu } from "../../../../yonetim-paneli/panel-oturumu";
import { menuyuKur, panelGruplari, panelSayfalari } from "../../../../yonetim-paneli/sayfa-agaci";

export default async function PanelDuzeni({ children }: { children: ReactNode }) {
  const { eposta, yetkili } = await panelOturumu();
  const vt = siteninVeritabani();
  const menu = menuyuKur(panelSayfalari, yetkili, (kod) => eklentiAcikMi(calisanSite(), kod));
  const [ad, logo, sayilar] = await Promise.all([
    magazaninAdi(vt),
    magazaLogosu(vt),
    menuSayilariniOku(
      vt,
      menu.flatMap(({ sayfalar }) => sayfalar.flatMap(({ sayac }) => sayac ?? [])),
    ),
  ]);
  const gruplar = menu.map(({ grup, sayfalar }) => ({
    kod: grup ?? "",
    ad: grup === null ? null : metin(panelGruplari[grup]),
    sayfalar: sayfalar.map(({ isaret, sayac, ...sayfa }) => {
      const sayi = sayac === undefined ? undefined : sayilar[sayac];
      return {
        ...sayfa,
        ad: metin(sayfa.ad),
        ...(isaret === undefined ? {} : { isaret: metin(isaret) }),
        ...(sayac === undefined || sayi === undefined
          ? {}
          : {
              sayi: {
                deger: bicim().sayi(sayi),
                yazi: doldur(metin(menuSayaciTanimlari[sayac].yazi), { sayi: bicim().sayi(sayi) }),
              },
            }),
      };
    }),
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
      // Panelin araması (kart 0321): yalnız izni olan türler; ekran ötekilerin isteğini göndermez.
      aramaTurleri={panelAramaTurKodlari.filter((tur) => yetkili(panelAramaTurleri[tur].izin))}
    >
      {children}
    </PanelCercevesi>
  );
}
