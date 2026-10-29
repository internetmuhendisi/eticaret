// GET /kapi/herkese-acik/saglik (uç belgesi: cekirdek/kapi/uclar.md).
import { z } from "zod";
import { saglikDurumu } from "../../izleme/saglik.ts";
import { herkeseAcik } from "../../kayitlar/izinler.ts";
import { ucTanimla } from "../uc.ts";

export const saglikUcu = ucTanimla({
  giris: "herkese-acik",
  sema: z.strictObject({}),
  izin: herkeseAcik,
  sinir: "genel",
  isle: () => saglikDurumu(),
});
