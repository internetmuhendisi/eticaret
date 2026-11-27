// Rapor uçları (kart 0317, 0318; karar 0195, 0196; uç belgesi: cekirdek/kapi/uclar.md). Uç yalnız yönlendirir: istek
// sayfayla aynı işlevle çözülür (raporIsteginiCoz, raporDonemleri), kurallar rapor modülündedir. Müşteri raporu
// üyelerin adlarını taşır: her indirmesi değişiklik kaydına girer (kişisel veri çıkışı; dönem ve satır sayısı).
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { raporTurleri } from "../../kayitlar/rapor.ts";
import { degisikligiKaydet } from "../../moduller/degisiklik-kaydi/servis.ts";
import {
  kuponRaporuCsv,
  musteriRaporuCsv,
  satisRaporuCsv,
  urunRaporuCsv,
} from "../../moduller/rapor/csv.ts";
import { kuponRaporu } from "../../moduller/rapor/kupon.ts";
import { musteriRaporu } from "../../moduller/rapor/musteri.ts";
import { urunRaporu, urunRaporuSiralamalari } from "../../moduller/rapor/urun.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { raporDonemleri, raporIsteginiCoz, raporuOku } from "../../yonetim-paneli/raporlar/veri.ts";
import { ucTanimla } from "../uc.ts";
import { DosyaYaniti } from "../zarf.ts";

const csvTuru = "text/csv; charset=utf-8";

export const raporIstegiSemasi = z.strictObject({
  rapor: z.enum(raporTurleri).optional(),
  donem: z.string().max(40).optional(),
  karsilastir: z.enum(["0", "1"]).optional(),
  sirala: z.enum(urunRaporuSiralamalari).optional(),
});

// GET /kapi/yonetici/rapor-csv?rapor=&donem=&karsilastir=&sirala=: raporun CSV dosyası, ekrandaki raporun aynısı
// (bütün satırlarıyla); dönem geçersizse sitenin varsayılan dönemi.
export const raporCsvUcu = ucTanimla({
  giris: "yonetici",
  sema: raporIstegiSemasi,
  izin: "rapor.gor",
  sinir: "genel",
  isle: async (girdi, _istek, _yanit, { hesapKimligi }) => {
    const site = calisanSite();
    const vt = siteninVeritabani();
    const istek = await raporIsteginiCoz(vt, site, girdi);
    const { donem } = raporDonemleri(site, istek);
    const dosya = async (): Promise<Buffer> => {
      switch (istek.rapor) {
        case "satis":
          return satisRaporuCsv(site, await raporuOku(vt, site, istek));
        case "urunler":
          return urunRaporuCsv(
            site,
            donem,
            await urunRaporu(site).satirlar(vt, donem, istek.sirala),
          );
        case "kuponlar": {
          const servis = kuponRaporu(site);
          return kuponRaporuCsv(
            site,
            donem,
            await servis.ozet(vt, donem),
            await servis.satirlar(vt, donem),
          );
        }
        case "musteriler": {
          const servis = musteriRaporu(site);
          const satirlar = await servis.enCokAlanlar(vt, donem);
          const icerik = musteriRaporuCsv(site, donem, await servis.ozet(vt, donem), satirlar);
          await vt.transaction((islem) =>
            degisikligiKaydet(islem, {
              kim: { tur: "yonetici", kimlik: hesapKimligi },
              islem: "rapor.musteriler-indirildi",
              kayit: { tur: "rapor-indirme", kimlik: randomUUID() },
              eski: null,
              yeni: {
                baslangic: donem.baslangic,
                bitis: donem.bitis,
                satirSayisi: satirlar.length,
              },
            }),
          );
          return icerik;
        }
      }
    };
    const ad = `${istek.rapor === "satis" ? "satis-raporu" : `rapor-${istek.rapor}`}-${donem.baslangic}-${donem.bitis}.csv`;
    return new DosyaYaniti(new Uint8Array(await dosya()), csvTuru, ad, "ozel", ad);
  },
});
