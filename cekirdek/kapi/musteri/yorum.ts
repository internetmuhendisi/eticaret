// Müşterinin yorum uçları (kart 0139, uç belgesi: cekirdek/kapi/uclar.md). Uç yalnız yönlendirir: kuralların
// hepsi yorum servisindedir (cekirdek/moduller/yorum/servis.ts). Müşterinin kimliği yalnız kapıdan gelir.
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { robotCevabiniDogrula } from "../../moduller/robot-korumasi/servis.ts";
import { yorumGirdisi, yorumIzniSemasi } from "../../moduller/yorum/semalar.ts";
import { yorumServisi } from "../../moduller/yorum/servis.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { ucTanimla } from "../uc.ts";

// GET /kapi/musteri/yorum-izni?urun=<kimlik>: müşteri bu ürüne yorum yazabilir mi.
export const yorumIzniUcu = ucTanimla({
  giris: "musteri",
  sema: yorumIzniSemasi,
  izin: "yorum.kendi.yaz",
  sinir: "genel",
  isle: async ({ urun }, _istek, _yanit, { hesapKimligi }) => ({
    izin: await yorumServisi(calisanSite()).yorumIzni(siteninVeritabani(), hesapKimligi, urun),
  }),
});

// POST /kapi/musteri/yorum: yorumu onay bekler olarak yazar.
export const yorumYazUcu = ucTanimla({
  giris: "musteri",
  sema: yorumGirdisi,
  izin: "yorum.kendi.yaz",
  sinir: "siki",
  isle: async ({ robotCevabi, ...girdi }, _istek, _yanit, { hesapKimligi }) => {
    await robotCevabiniDogrula(robotCevabi);
    await yorumServisi(calisanSite()).yorumYaz(siteninVeritabani(), hesapKimligi, girdi);
    return {};
  },
});
