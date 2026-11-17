// GET /kapi/musteri/son-teslimat (kart 0214, karar 0141; uç belgesi: cekirdek/kapi/uclar.md). Giriş yapmış müşterinin
// en son siparişinin teslimat bilgisi: ödeme adımı onu teslimat adresi olarak önerir. Müşterinin kimliği yalnız
// kapıdan gelir; başka müşterinin siparişi okunmaz.
import { z } from "zod";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { siparisServisi } from "../../moduller/siparis/servis.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { ucTanimla } from "../uc.ts";

export const sonTeslimatUcu = ucTanimla({
  giris: "musteri",
  sema: z.strictObject({}),
  izin: "odeme.kendi.baslat",
  sinir: "genel",
  isle: async (_girdi, _istek, _yanit, { hesapKimligi }) => ({
    teslimat: await siparisServisi(calisanSite()).sonTeslimat(siteninVeritabani(), hesapKimligi),
  }),
});
