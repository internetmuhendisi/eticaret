// Girişli panel sayfalarının düzeni ve çerçevesi (kart 0141). Asıl kontrol ara katmandadır (proxy.ts); bu ikinci
// katmandır, adres eşleşmesi bir gün yanılsa bile panel açılmaz. Anahtarı değiştirmeden sorar (panelOturumu,
// oturumAcikMi ile aynı kural): sayfa çizerken çerez yazılamaz (karar 0039, 0042). Menü sayfa ağacından ve
// yöneticinin sunucudan okunan izinlerinden kurulur; izni olmayan sayfa menüde görünmez. Menüdeki sayılar (onay
// bekleyen yorum, kart 0277) yalnız görünen sayfalar için istek başına okunur; panelin işlemleri sayfayı
// yenilediğinden (router.refresh) sayı işlemden sonra güncellenir. Bildirim zilinin ilk sayısı da burada okunur
// (kart 0280); sonrakini zil sayfa değişince kendisi sorar.
import type { ReactNode } from "react";
import { calisanSite } from "../../../../ayar-semasi/calisan-site";
import { eklentiAcikMi } from "../../../../eklentiler/acik";
import { hatayiKaydet } from "../../../../izleme/hata-katmani";
import { altyapiAdi } from "../../../../kayitlar/altyapi";
import { panelAramaTurKodlari, panelAramaTurleri } from "../../../../kayitlar/panel-arama";
import { doldur } from "../../../../metinler/doldur";
import { bicim, metin } from "../../../../metinler/site-metni";
import { logonunYolu, magazaLogosu } from "../../../../moduller/magaza-ayarlari/logo";
import { magazaninAdi } from "../../../../moduller/magaza-ayarlari/servis";
import { okunmamisSayisi } from "../../../../moduller/yonetici-bildirimi/panel";
import { siteninVeritabani } from "../../../../veritabani/baglanti";
import { menuSayaciTanimlari, menuSayilariniOku } from "../../../../yonetim-paneli/menu-sayaclari";
import { PanelCercevesi } from "../../../../yonetim-paneli/panel-cercevesi";
import { panelOturumu } from "../../../../yonetim-paneli/panel-oturumu";
import {
  menuyuKur,
  panelGruplari,
  panelSayfalari,
  sayfaTanimi,
} from "../../../../yonetim-paneli/sayfa-agaci";

export default async function PanelDuzeni({ children }: { children: ReactNode }) {
  const { kimlik, eposta, yetkili } = await panelOturumu();
  const vt = siteninVeritabani();
  const menu = menuyuKur(panelSayfalari, yetkili, (kod) => eklentiAcikMi(calisanSite(), kod));
  // Bildirim zili (kart 0280): yöneticinin kendi hesabını görme izniyle; okunmamış sayısı okunamazsa panel düşmez.
  const zilVar = yetkili("ekip.kendi-hesabi.gor");
  const [ad, logo, sayilar, bildirimSayisi] = await Promise.all([
    magazaninAdi(vt),
    magazaLogosu(vt),
    menuSayilariniOku(
      vt,
      menu.flatMap(({ sayfalar }) => sayfalar.flatMap(({ sayac }) => sayac ?? [])),
    ),
    zilVar
      ? okunmamisSayisi(vt, kimlik, yetkili).catch((hata: unknown) => {
          hatayiKaydet(hata, { ekran: "panel-bildirimleri" });
          return 0;
        })
      : 0,
  ]);
  const ayarlar = sayfaTanimi(panelSayfalari, "siparis-ayarlari");
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
      bildirimler={
        zilVar
          ? {
              ilkSayi: bildirimSayisi,
              saklamaGun: bicim().sayi(calisanSite().ayarlar.panelBildirimiSaklamaGun),
              // Bildirim ayarları Sipariş ayarlarının bölümüdür; sayfayı göremeyene bağlantı yoktur.
              ayarlarAdresi:
                ayarlar !== undefined && (ayarlar.izin === null || yetkili(ayarlar.izin))
                  ? `${ayarlar.adres}#yonetici-bildirimleri`
                  : null,
            }
          : null
      }
    >
      {children}
    </PanelCercevesi>
  );
}
