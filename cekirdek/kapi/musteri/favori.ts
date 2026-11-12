// Müşterinin favori uçları (kart 0140, uç belgesi: cekirdek/kapi/uclar.md). Uç yalnız yönlendirir: kuralların
// hepsi favori servisindedir (cekirdek/moduller/favori/servis.ts). Müşterinin kimliği yalnız kapıdan gelir.
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import {
  favoriBirlestirSemasi,
  favorilerSemasi,
  favoriSemasi,
} from "../../moduller/favori/semalar.ts";
import { favoriServisi } from "../../moduller/favori/servis.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { ucTanimla } from "../uc.ts";

// GET /kapi/musteri/favoriler: müşterinin vitrinde sayfası açılan favorileri, en yeni önce.
export const favorilerUcu = ucTanimla({
  giris: "musteri",
  sema: favorilerSemasi,
  izin: "favori.kendi.gor",
  sinir: "genel",
  isle: async (_girdi, _istek, _yanit, { hesapKimligi }) => ({
    favoriler: await favoriServisi(calisanSite()).favoriListesi(siteninVeritabani(), hesapKimligi),
  }),
});

// POST /kapi/musteri/favori: ürünü favorilere ekler ya da çıkarır, güncel listeyi döner.
export const favoriUcu = ucTanimla({
  giris: "musteri",
  sema: favoriSemasi,
  izin: "favori.kendi.degistir",
  sinir: "genel",
  isle: async ({ urun, favoride }, _istek, _yanit, { hesapKimligi }) => ({
    favoriler: await favoriServisi(calisanSite()).favoriDegistir(
      siteninVeritabani(),
      hesapKimligi,
      urun,
      favoride,
    ),
  }),
});

// POST /kapi/musteri/favori-birlestir: tarayıcıdaki listeyi hesaba birleştirir.
export const favoriBirlestirUcu = ucTanimla({
  giris: "musteri",
  sema: favoriBirlestirSemasi,
  izin: "favori.kendi.degistir",
  sinir: "genel",
  isle: async ({ urunler }, _istek, _yanit, { hesapKimligi }) =>
    favoriServisi(calisanSite()).favorileriBirlestir(siteninVeritabani(), hesapKimligi, urunler),
});
