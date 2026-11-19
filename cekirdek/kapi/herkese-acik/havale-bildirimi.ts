// POST /kapi/herkese-acik/havale-bildirimi (kart 0214, karar 0141; uç belgesi: cekirdek/kapi/uclar.md). Üye olmayan
// müşteri havaleyle ödediğini sipariş numarası ve siparişteki e-postayla bildirir. Uç yalnız yönlendirir: kurallar
// sipariş servisindedir. Numara ile e-posta eşleşmezse bulunamadı (siparişin var olup olmadığı belli olmaz). Tema
// demosunda kapalıdır.
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { herkeseAcik } from "../../kayitlar/izinler.ts";
import { robotCevabiniDogrula } from "../../moduller/robot-korumasi/servis.ts";
import { misafirHavaleBildirimiGirdisi } from "../../moduller/siparis/havale-bildirimi-semalari.ts";
import { siparisServisi } from "../../moduller/siparis/servis.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { ucTanimla } from "../uc.ts";

export const havaleBildirimiUcu = ucTanimla({
  giris: "herkese-acik",
  temaDemosunda: "kapali",
  sema: misafirHavaleBildirimiGirdisi,
  izin: herkeseAcik,
  sinir: "siki",
  isle: async ({ robotCevabi, eposta, ...girdi }) => {
    // Veritabanına bakmadan önce: robot numara ve e-posta eşleşmesini deneyemesin.
    await robotCevabiniDogrula(robotCevabi);
    return siparisServisi(calisanSite()).havaleBildir(
      siteninVeritabani(),
      { tur: "eposta", eposta },
      girdi,
    );
  },
});
