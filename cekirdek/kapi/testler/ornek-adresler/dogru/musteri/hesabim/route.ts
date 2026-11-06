// Erişim testinin örnek ucu (kart 0030): kaydı kapının verdiği kimlikle süzen müşteri ucu.
import { eq } from "drizzle-orm";
import { z } from "zod";
import { musteriler } from "../../../../../../moduller/musteri/model.ts";
import { siteninVeritabani } from "../../../../../../veritabani/baglanti.ts";
import { ucTanimla } from "../../../../../uc.ts";

export const GET = ucTanimla({
  giris: "musteri",
  // Girdideki kimlik yok sayılır: kim olduğu oturumdan gelir.
  sema: z.object({ kimlik: z.string().optional() }),
  izin: "musteri.kendi-hesabi.gor",
  sinir: "genel",
  isle: async (_girdi, _istek, _yanit, { hesapKimligi }) => {
    const [kayit] = await siteninVeritabani()
      .select({ eposta: musteriler.eposta })
      .from(musteriler)
      .where(eq(musteriler.kimlik, hesapKimligi));
    return { kayit };
  },
});
