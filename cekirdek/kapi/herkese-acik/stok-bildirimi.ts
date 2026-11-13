// POST /kapi/herkese-acik/stok-bildirimi (kart 0144, karar 0117; uç belgesi: cekirdek/kapi/uclar.md). Üye olmayan
// müşteri tükenmiş birim için e-postasını bırakır. Uç yalnız yönlendirir: kurallar eklentinin servisindedir.
// Eklenti kapalıysa bulunamadı; mağaza sahibi üye olmayana kapattıysa oturum-yok (ekran girişe yönlendirir).
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { stokBildirimiTalebiSemasi } from "../../eklentiler/stoga-gelince-haber-ver/semalar.ts";
import { stokBildirimiServisi } from "../../eklentiler/stoga-gelince-haber-ver/servis.ts";
import { herkeseAcik } from "../../kayitlar/izinler.ts";
import { robotCevabiniDogrula } from "../../moduller/robot-korumasi/servis.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { ucTanimla } from "../uc.ts";
import { BilinenHata } from "../zarf.ts";

export const stokBildirimiUcu = ucTanimla({
  giris: "herkese-acik",
  sema: stokBildirimiTalebiSemasi,
  izin: herkeseAcik,
  sinir: "siki",
  isle: async ({ robotCevabi, birim, eposta }) => {
    const servis = stokBildirimiServisi(calisanSite());
    // Kapalı eklentinin ucu yoktur: önce bu sorulur (veritabanına gitmez).
    if (!servis.acikMi()) throw new BilinenHata("bulunamadi");
    // Veritabanına bakmadan önce: robot birimin ya da adresin durumunu soramasın.
    await robotCevabiniDogrula(robotCevabi);
    const vt = siteninVeritabani();
    if (!(await servis.uyeOlmayanIzinliMi(vt))) throw new BilinenHata("oturum-yok");
    await servis.talepYaz(vt, birim, eposta);
    return {};
  },
});
