// Hesabım sayfasını çizen isteğin müşterisi (kart 0237, karar 0149). Ürün sayfalarının tersine hesap sayfası kişiye
// özeldir, verisini sunucuda çizer: oturum burada okunur. Anahtar değiştirilmeden sorulur (oturumunHesabi): sayfa
// çizerken çerez yazılamaz, oturumu yenilemek onu kapatırdı (karar 0039). Kısa anahtarı dolmuş oturum yenileme
// anahtarıyla tanınır; çerezleri sayfanın hesap durumu sorusu yeniler. Düzen ve sayfa aynı istekte bir kez okur.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { oturumCerezAdlari } from "../../kayitlar/oturum";
import { musteriHesabi } from "../../moduller/musteri/servis";
import { oturumunHesabi } from "../../moduller/oturum/servis";
import { siteninVeritabani } from "../../veritabani/baglanti";
import { girisAdresiDonuslu } from "../adresler";
import { musteriSayfasiniAc } from "../yalniz-gezinti";

export type HesapOturumu = { kimlik: string; eposta: string };

export const hesapOturumu = cache(async (): Promise<HesapOturumu | null> => {
  const cerezler = await cookies();
  const kisaAnahtar = cerezler.get(oturumCerezAdlari.musteri.kisa)?.value;
  const yenilemeAnahtari = cerezler.get(oturumCerezAdlari.musteri.yenileme)?.value;
  const vt = siteninVeritabani();
  const kimlik = await oturumunHesabi(vt, "musteri", {
    ...(kisaAnahtar === undefined ? {} : { kisaAnahtar }),
    ...(yenilemeAnahtari === undefined ? {} : { yenilemeAnahtari }),
  });
  if (kimlik === null) return null;
  // Oturum ile bu okuma arasında hesap kapatılmış olabilir.
  const hesap = await musteriHesabi(vt, kimlik);
  return hesap === null ? null : { kimlik, eposta: hesap.eposta };
});

// Hesap sayfasının kapısı: tema demosunda bulunamadı, girişsiz müşteri girişe gider ve girişten sonra bu sayfaya döner.
export const hesapSayfasiniAc = async (adres: string): Promise<HesapOturumu> => {
  musteriSayfasiniAc();
  const oturum = await hesapOturumu();
  if (oturum === null) redirect(girisAdresiDonuslu(adres));
  return oturum;
};
