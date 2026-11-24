// Menüler ekranının verisi (kart 0143), sunucuda: menü listesi ve seçili menünün öğeleri durumlarıyla (ya da kategori
// menüsünde kategori ağacı). Menü yalnız menü servisiyle okunur; değişiklikler kapıdaki menü uçlarından gider.
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { BilinenHata } from "../../kapi/zarf";
import { sabitSayfaOku } from "../../moduller/icerik/sayfa";
import { siteninServisi } from "../../moduller/magaza-ayarlari/servis";
import { type Menu, menuleriOku, panelMenusu } from "../../moduller/menu/servis";
import { siteninVeritabani } from "../../veritabani/baglanti";
import { kimligiDuzelt, kimlikMi } from "../../veritabani/kimlik";
import type { HazirHedef } from "./ekran";

export type MenulerEkraniVerisi = {
  menuler: Menu[];
  // Seçili menü: adreste verilen, yoksa (ya da bulunamazsa) ilk menü.
  secili: Awaited<ReturnType<typeof panelMenusu>> | undefined;
};

export const menulerEkraniVerisi = async (
  seciliKimlik: string | undefined,
  { elleMenuOnce = false }: { elleMenuOnce?: boolean } = {},
): Promise<MenulerEkraniVerisi> => {
  const vt = siteninVeritabani();
  const menuler = await menuleriOku(vt);
  // Adresteki kimlik büyük harfle de yazılabilir (karar 0112).
  const kimlik =
    seciliKimlik === undefined || !kimlikMi(seciliKimlik) ? undefined : kimligiDuzelt(seciliKimlik);
  // Menüye öğe eklemeye gelen (kart 0273) menü vermediyse öğe alabilen ilk menü seçilir.
  const aranan =
    menuler.find((menu) => menu.kimlik === kimlik) ??
    (elleMenuOnce ? menuler.find((menu) => menu.tur === "elle") : undefined) ??
    menuler[0];
  if (aranan === undefined) return { menuler, secili: undefined };
  try {
    // Blog yazısına bağlı öğe blog kapalıyken "görünmüyor" işaretlidir (kart 0273).
    const blogAcik = await siteninServisi(calisanSite()).tekOku(vt, "blogAcik");
    return { menuler, secili: await panelMenusu(vt, aranan.kimlik, { blogAcik }) };
  } catch (hata) {
    // Okunurken silindiyse menü seçilmemiş sayılır.
    if (hata instanceof BilinenHata && hata.kod === "bulunamadi")
      return { menuler, secili: undefined };
    throw hata;
  }
};

// Menüye eklenecek sabit sayfa (kart 0273, ?ekle-sayfa=): silinmemiş sayfanın kimliği ve başlığı; yoksa undefined.
export const menuyeEklenecekSayfa = async (kimlik: string): Promise<HazirHedef | undefined> => {
  if (!kimlikMi(kimlik)) return undefined;
  const sayfa = await sabitSayfaOku(siteninVeritabani(), kimlik);
  return sayfa === null
    ? undefined
    : { tur: "sayfa", kayit: { kimlik: sayfa.kimlik, ad: sayfa.baslik, adresAdi: sayfa.adresAdi } };
};
