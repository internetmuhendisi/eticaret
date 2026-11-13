// Menüler ekranının verisi (kart 0143), sunucuda: menü listesi ve seçili menünün öğeleri durumlarıyla (ya da kategori
// menüsünde kategori ağacı). Menü yalnız menü servisiyle okunur; değişiklikler kapıdaki menü uçlarından gider.
import { BilinenHata } from "../../kapi/zarf";
import { type Menu, menuleriOku, panelMenusu } from "../../moduller/menu/servis";
import { siteninVeritabani } from "../../veritabani/baglanti";
import { kimligiDuzelt, kimlikMi } from "../../veritabani/kimlik";

export type MenulerEkraniVerisi = {
  menuler: Menu[];
  // Seçili menü: adreste verilen, yoksa (ya da bulunamazsa) ilk menü.
  secili: Awaited<ReturnType<typeof panelMenusu>> | undefined;
};

export const menulerEkraniVerisi = async (
  seciliKimlik: string | undefined,
): Promise<MenulerEkraniVerisi> => {
  const vt = siteninVeritabani();
  const menuler = await menuleriOku(vt);
  // Adresteki kimlik büyük harfle de yazılabilir (karar 0112).
  const kimlik =
    seciliKimlik === undefined || !kimlikMi(seciliKimlik) ? undefined : kimligiDuzelt(seciliKimlik);
  const aranan = menuler.find((menu) => menu.kimlik === kimlik) ?? menuler[0];
  if (aranan === undefined) return { menuler, secili: undefined };
  try {
    return { menuler, secili: await panelMenusu(vt, aranan.kimlik) };
  } catch (hata) {
    // Okunurken silindiyse menü seçilmemiş sayılır.
    if (hata instanceof BilinenHata && hata.kod === "bulunamadi")
      return { menuler, secili: undefined };
    throw hata;
  }
};
