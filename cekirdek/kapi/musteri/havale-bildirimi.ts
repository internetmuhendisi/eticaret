// POST /kapi/musteri/havale-bildirimi (kart 0214, karar 0141; uç belgesi: cekirdek/kapi/uclar.md). Giriş yapmış müşteri
// kendi havale siparişi için ödediğini bildirir; sipariş yalnız kendi hesabınınsa bulunur. Kimlik yalnız kapıdan gelir.
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { uyeHavaleBildirimiGirdisi } from "../../moduller/siparis/semalar.ts";
import { siparisServisi } from "../../moduller/siparis/servis.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { ucTanimla } from "../uc.ts";

export const uyeHavaleBildirimiUcu = ucTanimla({
  giris: "musteri",
  sema: uyeHavaleBildirimiGirdisi,
  izin: "siparis.kendi.havale-bildir",
  sinir: "siki",
  isle: (girdi, _istek, _yanit, { hesapKimligi }) =>
    siparisServisi(calisanSite()).havaleBildir(
      siteninVeritabani(),
      { tur: "musteri", musteri: hesapKimligi },
      girdi,
    ),
});
