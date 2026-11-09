// GET /kapi/herkese-acik/urun-gorseli (uç belgesi: cekirdek/kapi/uclar.md, kart 0109).
import { z } from "zod";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { type GorselBoyutu, gorselBoyutAdlari } from "../../kayitlar/gorsel.ts";
import { herkeseAcik } from "../../kayitlar/izinler.ts";
import { urunGorseli } from "../../moduller/urun/urun-gorseli.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { kimlikMi } from "../../veritabani/turler.ts";
import { ucTanimla } from "../uc.ts";
import { BilinenHata, DosyaYaniti } from "../zarf.ts";

// Hangi görselin verileceğine servis karar verir (yalnız vitrinde sayfası açılan ürünün canlı görseli).
export const urunGorseliUcu = ucTanimla({
  giris: "herkese-acik",
  sema: z.strictObject({
    // Galeri öğesinin kimliği.
    o: z.string().refine(kimlikMi),
    // Kayıttaki boyutun adı; özgün görsel verilmez.
    b: z.enum(gorselBoyutAdlari as [GorselBoyutu, ...GorselBoyutu[]]),
  }),
  izin: herkeseAcik,
  sinir: "gorsel",
  isle: async (girdi) => {
    const gorsel = await urunGorseli(siteninVeritabani(), calisanSite(), girdi.o, girdi.b);
    if (gorsel === undefined) throw new BilinenHata("bulunamadi");
    return new DosyaYaniti(gorsel.icerik, gorsel.mime, gorsel.etiket);
  },
});
