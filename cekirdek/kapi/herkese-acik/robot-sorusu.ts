// GET /kapi/herkese-acik/robot-sorusu (uç belgesi: cekirdek/kapi/uclar.md). Kayıt formu açılınca sorulur.
import { z } from "zod";
import { herkeseAcik } from "../../kayitlar/izinler.ts";
import { robotSorusuUret } from "../../moduller/robot-korumasi/servis.ts";
import { ucTanimla } from "../uc.ts";

export const robotSorusuUcu = ucTanimla({
  giris: "herkese-acik",
  temaDemosunda: "acik",
  sema: z.strictObject({}),
  izin: herkeseAcik,
  sinir: "genel",
  isle: () => robotSorusuUret(),
});
