// Erişim testinin örnek ucu (kart 0030): izni doğru yazılmış yönetici ucu. Uygulamada adresi yoktur.
import { z } from "zod";
import { ucTanimla } from "../../../../../uc.ts";

export const GET = ucTanimla({
  giris: "yonetici",
  sema: z.strictObject({}),
  izin: "ekip.gor",
  sinir: "genel",
  isle: async () => ({}),
});
