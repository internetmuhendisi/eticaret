// GET /kapi/herkese-acik/logo (uç belgesi: cekirdek/kapi/uclar.md, kart 0073).
import { z } from "zod";
import { herkeseAcik } from "../../kayitlar/izinler.ts";
import { magazaLogosu } from "../../moduller/magaza-ayarlari/logo.ts";
import { ucTanimla } from "../uc.ts";
import { BilinenHata, DosyaYaniti } from "../zarf.ts";

// Hangi logo görüneceğine servis karar verir (yüklenen, ilk logo ya da yok). `s` yalnız önbelleği
// aşmak içindir (e-postadaki adres), yanıtı değiştirmez.
export const logoUcu = ucTanimla({
  giris: "herkese-acik",
  temaDemosunda: "acik",
  sema: z.strictObject({
    s: z
      .string()
      .regex(/^[0-9a-f]{1,64}$/)
      .optional(),
  }),
  izin: herkeseAcik,
  sinir: "genel",
  isle: async () => {
    const logo = await magazaLogosu();
    if (logo === undefined) throw new BilinenHata("bulunamadi");
    return new DosyaYaniti(logo.icerik, logo.mime, logo.etiket);
  },
});
