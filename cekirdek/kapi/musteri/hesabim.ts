// GET /kapi/musteri/hesabim (uç belgesi: cekirdek/kapi/uclar.md). Vitrin oturumu buradan sorar: sayfa
// çizerken oturum okunamaz (karar 0039), burada çerez yazılabilir. Kimlik yalnız kapıdan gelir.
import { z } from "zod";
import { musteriHesabi } from "../../moduller/musteri/servis.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { ucTanimla } from "../uc.ts";
import { BilinenHata } from "../zarf.ts";

export const musteriHesabimUcu = ucTanimla({
  giris: "musteri",
  sema: z.strictObject({}),
  izin: "musteri.kendi-hesabi.gor",
  sinir: "genel",
  isle: async (_girdi, _istek, _yanit, { hesapKimligi }) => {
    const hesap = await musteriHesabi(siteninVeritabani(), hesapKimligi);
    if (hesap === null) throw new BilinenHata("oturum-yok");
    return hesap;
  },
});
