// Sabit sayfalar ekranlarının verisi (kart 0273), sunucuda: liste (durum, adres ve bağlı olduğu menüler) ve sayfanın
// formu. Sayfa yalnız sabit sayfa servisiyle okunur; menü yerleri menü servisinden (kayitlarinMenuYerleri) gelir.
import type { SabitSayfaDurumu } from "../../kayitlar/sayfa";
import { sabitSayfalariOku, sabitSayfaOku } from "../../moduller/icerik/sayfa";
import { kayitlarinMenuYerleri, type MenuYeri } from "../../moduller/menu/servis";
import { siteninVeritabani } from "../../veritabani/baglanti";

export type SayfaSatiri = {
  kimlik: string;
  baslik: string;
  adresAdi: string;
  durum: SabitSayfaDurumu;
  menuler: MenuYeri[];
};

export const sayfalarListesiVerisi = async (): Promise<SayfaSatiri[]> => {
  const vt = siteninVeritabani();
  const [sayfalar, yerler] = await Promise.all([
    sabitSayfalariOku(vt),
    kayitlarinMenuYerleri(vt, "sayfa"),
  ]);
  return sayfalar.map((sayfa) => ({
    kimlik: sayfa.kimlik,
    baslik: sayfa.baslik,
    adresAdi: sayfa.adresAdi,
    durum: sayfa.durum,
    menuler: yerler.get(sayfa.kimlik) ?? [],
  }));
};

export type SayfaFormu = {
  baslik: string;
  adresAdi: string;
  icerik: string;
  aciklama: string;
  durum: SabitSayfaDurumu;
};

export const bosSayfaFormu: SayfaFormu = {
  baslik: "",
  adresAdi: "",
  icerik: "",
  aciklama: "",
  durum: "taslak",
};

export type SayfaEkraniVerisi = {
  // Yeni sayfada yok.
  kimlik?: string;
  gorulen?: string;
  form: SayfaFormu;
  menuler: MenuYeri[];
  izinler: { degistir: boolean; sil: boolean; menuDegistir: boolean };
};

// Sayfa ekranının verisi: yeni sayfada boş form; var olan sayfada formu, yoksa (silinmiş ya da olmayan) undefined.
export const sayfaEkraniVerisi = async (
  kimlik: string | undefined,
  yetkili: (izin: "icerik.degistir" | "icerik.sil" | "menu.degistir") => boolean,
): Promise<SayfaEkraniVerisi | undefined> => {
  const izinler = {
    degistir: yetkili("icerik.degistir"),
    sil: yetkili("icerik.sil"),
    menuDegistir: yetkili("menu.degistir"),
  };
  if (kimlik === undefined) return { form: bosSayfaFormu, menuler: [], izinler };
  const vt = siteninVeritabani();
  const [sayfa, yerler] = await Promise.all([
    sabitSayfaOku(vt, kimlik),
    kayitlarinMenuYerleri(vt, "sayfa"),
  ]);
  if (sayfa === null) return undefined;
  return {
    kimlik: sayfa.kimlik,
    gorulen: sayfa.guncellenmeZamani.toISOString(),
    form: {
      baslik: sayfa.baslik,
      adresAdi: sayfa.adresAdi,
      icerik: sayfa.icerik,
      aciklama: sayfa.aciklama ?? "",
      durum: sayfa.durum,
    },
    menuler: yerler.get(sayfa.kimlik) ?? [],
    izinler,
  };
};
