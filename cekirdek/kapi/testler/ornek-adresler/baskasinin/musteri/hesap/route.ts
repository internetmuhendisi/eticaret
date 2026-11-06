// Erişim testinin bozuk örneği (kart 0030): kimliği girdiden aldığı için başka müşterinin kaydını döner.
import { eq } from "drizzle-orm";
import { z } from "zod";
import { musteriler } from "../../../../../../moduller/musteri/model.ts";
import { siteninVeritabani } from "../../../../../../veritabani/baglanti.ts";
import { ucTanimla } from "../../../../../uc.ts";

export const GET = ucTanimla({
  giris: "musteri",
  sema: z.object({ kimlik: z.string() }),
  izin: "musteri.kendi-hesabi.gor",
  sinir: "genel",
  isle: async ({ kimlik }) => {
    const [kayit] = await siteninVeritabani()
      .select({ eposta: musteriler.eposta })
      .from(musteriler)
      .where(eq(musteriler.kimlik, kimlik));
    return { kayit };
  },
});
