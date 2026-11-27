// Rapor uçları (kart 0317, karar 0195; uç belgesi: cekirdek/kapi/uclar.md). Uç yalnız yönlendirir: istek sayfayla aynı
// işlevle çözülür (raporIsteginiCoz, raporuOku), kurallar rapor modülündedir.
import { z } from "zod";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { satisRaporuCsv } from "../../moduller/rapor/csv.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { raporIsteginiCoz, raporuOku } from "../../yonetim-paneli/raporlar/veri.ts";
import { ucTanimla } from "../uc.ts";
import { DosyaYaniti } from "../zarf.ts";

const csvTuru = "text/csv; charset=utf-8";

export const raporIstegiSemasi = z.strictObject({
  donem: z.string().max(40).optional(),
  karsilastir: z.enum(["0", "1"]).optional(),
});

// GET /kapi/yonetici/rapor-satis-csv?donem=&karsilastir=: satış raporu, indirilecek CSV dosyası olarak. Ekrandaki
// raporun aynısı: dönem geçersizse sitenin varsayılan dönemi.
export const satisRaporuCsvUcu = ucTanimla({
  giris: "yonetici",
  sema: raporIstegiSemasi,
  izin: "rapor.gor",
  sinir: "genel",
  isle: async (istek) => {
    const site = calisanSite();
    const vt = siteninVeritabani();
    const cozulen = await raporIsteginiCoz(vt, site, istek);
    const rapor = await raporuOku(vt, site, cozulen);
    const ad = `satis-raporu-${rapor.donem.baslangic}-${rapor.donem.bitis}.csv`;
    return new DosyaYaniti(new Uint8Array(satisRaporuCsv(site, rapor)), csvTuru, ad, "ozel", ad);
  },
});
