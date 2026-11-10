// Tema uçları (kart 0113, uç belgesi: cekirdek/kapi/uclar.md). Uç yalnız yönlendirir: kuralların hepsi tema
// servisindedir (cekirdek/moduller/tema/servis.ts). Değişikliği yapan yönetici kapıdan gelir.
import {
  temaDurumuSemasi,
  temaGeriDonusSemasi,
  temaYayiniSemasi,
} from "../../moduller/tema/semalar.ts";
import {
  siteninTemaServisi,
  type TemaSurumu,
  temaDegistirilebilirMi,
} from "../../moduller/tema/servis.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { ucTanimla } from "../uc.ts";

const surumYaniti = ({ sira, tema, ayarlar, geriDonulenSira }: TemaSurumu) => ({
  sira,
  tema,
  ayarlar,
  geriDonulenSira,
});

// GET /kapi/yonetici/tema: geçerli sürüm, kullanılabilir temalar ve mağaza sahibinin değiştirip
// değiştiremeyeceği.
export const temaDurumuUcu = ucTanimla({
  giris: "yonetici",
  sema: temaDurumuSemasi,
  izin: "tema.gor",
  sinir: "genel",
  isle: async () => {
    const servis = siteninTemaServisi();
    return {
      surum: surumYaniti(await servis.temaDurumu(siteninVeritabani())),
      temalar: servis.kullanilabilirTemalar(),
      degistirilebilir: temaDegistirilebilirMi(),
    };
  },
});

// POST /kapi/yonetici/tema: temayı ve ayarlarını yeni sürüm olarak yayınlar.
export const temaYayiniUcu = ucTanimla({
  giris: "yonetici",
  sema: temaYayiniSemasi,
  izin: "tema.degistir",
  sinir: "genel",
  isle: async (girdi, _istek, _yanit, { hesapKimligi }) =>
    surumYaniti(
      await siteninTemaServisi().temayiYayinla(
        siteninVeritabani(),
        { tur: "yonetici", kimlik: hesapKimligi },
        girdi,
      ),
    ),
});

// POST /kapi/yonetici/tema-geri-don: önceki bir sürüme döner.
export const temaGeriDonusUcu = ucTanimla({
  giris: "yonetici",
  sema: temaGeriDonusSemasi,
  izin: "tema.degistir",
  sinir: "genel",
  isle: async ({ sira }, _istek, _yanit, { hesapKimligi }) =>
    surumYaniti(
      await siteninTemaServisi().oncekiSurumeDon(
        siteninVeritabani(),
        { tur: "yonetici", kimlik: hesapKimligi },
        sira,
      ),
    ),
});
