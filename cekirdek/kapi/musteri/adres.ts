// Müşterinin adres defteri uçları (kart 0237, karar 0149; uç belgesi: cekirdek/kapi/uclar.md). Uç yalnız yönlendirir:
// kuralların hepsi adres servisindedir (cekirdek/moduller/musteri/adres.ts). Müşterinin kimliği yalnız kapıdan gelir.
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { adresServisi } from "../../moduller/musteri/adres.ts";
import {
  adresDegistirSemasi,
  adresEkleSemasi,
  adreslerSemasi,
  adresSilSemasi,
  adresVarsayilanSemasi,
} from "../../moduller/musteri/adres-semalari.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { ucTanimla } from "../uc.ts";

const servis = () => adresServisi(calisanSite());

// GET /kapi/musteri/adresler: müşterinin adresleri, önce varsayılan teslimat adresi, sonra en yeni.
export const adreslerUcu = ucTanimla({
  giris: "musteri",
  sema: adreslerSemasi,
  izin: "musteri.kendi-adresleri.gor",
  sinir: "genel",
  isle: async (_girdi, _istek, _yanit, { hesapKimligi }) => ({
    adresler: await servis().adresListesi(siteninVeritabani(), hesapKimligi),
  }),
});

// POST /kapi/musteri/adres: yeni adres; güncel listeyi döner.
export const adresEkleUcu = ucTanimla({
  giris: "musteri",
  sema: adresEkleSemasi,
  izin: "musteri.kendi-adresleri.degistir",
  sinir: "genel",
  isle: async (girdi, _istek, _yanit, { hesapKimligi }) => ({
    adresler: await servis().adresEkle(siteninVeritabani(), hesapKimligi, girdi),
  }),
});

// POST /kapi/musteri/adres-degistir: adresin bütün alanları; güncel listeyi döner.
export const adresDegistirUcu = ucTanimla({
  giris: "musteri",
  sema: adresDegistirSemasi,
  izin: "musteri.kendi-adresleri.degistir",
  sinir: "genel",
  isle: async ({ kimlik, ...girdi }, _istek, _yanit, { hesapKimligi }) => ({
    adresler: await servis().adresDegistir(siteninVeritabani(), hesapKimligi, kimlik, girdi),
  }),
});

// POST /kapi/musteri/adres-sil: adresi kalıcı siler; güncel listeyi döner.
export const adresSilUcu = ucTanimla({
  giris: "musteri",
  sema: adresSilSemasi,
  izin: "musteri.kendi-adresleri.degistir",
  sinir: "genel",
  isle: async ({ kimlik }, _istek, _yanit, { hesapKimligi }) => ({
    adresler: await servis().adresSil(siteninVeritabani(), hesapKimligi, kimlik),
  }),
});

// POST /kapi/musteri/adres-varsayilan: adres verilen türlerde varsayılan olur; güncel listeyi döner.
export const adresVarsayilanUcu = ucTanimla({
  giris: "musteri",
  sema: adresVarsayilanSemasi,
  izin: "musteri.kendi-adresleri.degistir",
  sinir: "genel",
  isle: async ({ kimlik, turler }, _istek, _yanit, { hesapKimligi }) => ({
    adresler: await servis().varsayilanYap(siteninVeritabani(), hesapKimligi, kimlik, turler),
  }),
});
