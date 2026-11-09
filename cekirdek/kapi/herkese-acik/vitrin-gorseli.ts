// GET /kapi/herkese-acik/vitrin-gorseli (uç belgesi: cekirdek/kapi/uclar.md, kart 0110).
import { z } from "zod";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { type GorselBoyutu, gorselBoyutAdlari } from "../../kayitlar/gorsel.ts";
import { herkeseAcik } from "../../kayitlar/izinler.ts";
import { vitrinGorseliOku } from "../../moduller/duzen/gorsel.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { kimlikMi } from "../../veritabani/turler.ts";
import { ucTanimla } from "../uc.ts";
import { BilinenHata, DosyaYaniti } from "../zarf.ts";

// Hangi görselin verileceğine servis karar verir (yalnız vitrinde kullanılan bölüm ve kategori görseli).
export const vitrinGorseliUcu = ucTanimla({
  giris: "herkese-acik",
  sema: z.strictObject({
    // Görselin dosya kimliği.
    d: z.string().refine(kimlikMi),
    // Kayıttaki boyutun adı; özgün görsel verilmez.
    b: z.enum(gorselBoyutAdlari as [GorselBoyutu, ...GorselBoyutu[]]),
  }),
  izin: herkeseAcik,
  sinir: "gorsel",
  isle: async (girdi) => {
    const gorsel = await vitrinGorseliOku(siteninVeritabani(), calisanSite(), girdi.d, girdi.b);
    if (gorsel === undefined) throw new BilinenHata("bulunamadi");
    return new DosyaYaniti(gorsel.icerik, gorsel.mime, gorsel.etiket);
  },
});
