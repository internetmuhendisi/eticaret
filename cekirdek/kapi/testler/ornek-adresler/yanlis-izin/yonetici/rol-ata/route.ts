// Erişim testinin bozuk örneği (kart 0030): rol atama ucuna fazla geniş izin yazılmış, belge başka diyor.
import { z } from "zod";
import { ucTanimla } from "../../../../../uc.ts";

export const POST = ucTanimla({
  giris: "yonetici",
  sema: z.strictObject({}),
  izin: "ekip.kendi-hesabi.gor",
  sinir: "genel",
  isle: async () => ({}),
});
