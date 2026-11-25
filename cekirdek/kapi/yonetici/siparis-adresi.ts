// Siparişin teslimat ve fatura bilgilerinin düzeltilmesi panelde (kart 0269, karar 0180; uç belgesi:
// cekirdek/kapi/uclar.md). Uç yalnız yönlendirir: kurallar servistedir (cekirdek/moduller/siparis/adres-duzeltme.ts).
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { siparisAdresServisi } from "../../moduller/siparis/adres-duzeltme.ts";
import { siparisAdresiSemasi } from "../../moduller/siparis/semalar.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { ucTanimla } from "../uc.ts";

// POST /kapi/yonetici/siparis-adresi: teslimat ve fatura bilgilerini düzeltir; aynı bilgiler bir şey yazmaz.
export const siparisAdresiUcu = ucTanimla({
  giris: "yonetici",
  sema: siparisAdresiSemasi,
  izin: "siparis.yonet",
  sinir: "genel",
  isle: async (girdi, _istek, _yanit, { hesapKimligi }) =>
    siparisAdresServisi(calisanSite()).duzelt(
      siteninVeritabani(),
      { tur: "yonetici", kimlik: hesapKimligi },
      girdi,
    ),
});
