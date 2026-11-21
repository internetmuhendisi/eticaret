// Kategori uçları (kart 0261, uç belgesi: cekirdek/kapi/uclar.md). Uç yalnız yönlendirir: kuralların hepsi (döngü,
// kardeş adı, adres adı, görsel, silmede altların üste çıkması, sıralama) kategori servisindedir
// (cekirdek/moduller/kategori/servis.ts). Değişikliği yapan yönetici kapıdan gelir.
import {
  type KategoriDegisikligi,
  type KategoriGirdisi,
  kategoriDegisikligiSemasi,
  kategoriEklemeSemasi,
  kategoriSilmeSemasi,
  kategoriSiralamaSemasi,
} from "../../moduller/kategori/semalar.ts";
import {
  kategoriDegistir,
  kategoriEkle,
  kategorileriSirala,
  kategoriSil,
} from "../../moduller/kategori/servis.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { ucTanimla } from "../uc.ts";

const yonetici = (hesapKimligi: string) => ({ tur: "yonetici" as const, kimlik: hesapKimligi });

// POST /kapi/yonetici/kategori-ekle
export const kategoriEklemeUcu = ucTanimla({
  giris: "yonetici",
  sema: kategoriEklemeSemasi,
  izin: "kategori.degistir",
  sinir: "genel",
  isle: async ({ kategori }, _istek, _yanit, { hesapKimligi }) => ({
    kimlik: await kategoriEkle(
      siteninVeritabani(),
      yonetici(hesapKimligi),
      kategori as KategoriGirdisi,
    ),
  }),
});

// POST /kapi/yonetici/kategori-degistir: yalnız verilen alan değişir; üstün değişmesi taşımadır.
export const kategoriDegisikligiUcu = ucTanimla({
  giris: "yonetici",
  sema: kategoriDegisikligiSemasi,
  izin: "kategori.degistir",
  sinir: "genel",
  isle: async ({ kimlik, kategori }, _istek, _yanit, { hesapKimligi }) => {
    await kategoriDegistir(
      siteninVeritabani(),
      yonetici(hesapKimligi),
      kimlik,
      kategori as KategoriDegisikligi,
    );
    return {};
  },
});

// POST /kapi/yonetici/kategori-sil: alt kategoriler bir üste çıkar, ürün bağlantıları kalkar.
export const kategoriSilmeUcu = ucTanimla({
  giris: "yonetici",
  sema: kategoriSilmeSemasi,
  izin: "kategori.sil",
  sinir: "genel",
  isle: async ({ kimlik }, _istek, _yanit, { hesapKimligi }) => {
    await kategoriSil(siteninVeritabani(), yonetici(hesapKimligi), kimlik);
    return {};
  },
});

// POST /kapi/yonetici/kategori-sirala: aynı üstün altındaki bütün kategorilerin yeni sırası.
export const kategoriSiralamaUcu = ucTanimla({
  giris: "yonetici",
  sema: kategoriSiralamaSemasi,
  izin: "kategori.degistir",
  sinir: "genel",
  isle: async ({ ust, kimlikler }, _istek, _yanit, { hesapKimligi }) => {
    await kategorileriSirala(siteninVeritabani(), yonetici(hesapKimligi), ust, kimlikler);
    return {};
  },
});
