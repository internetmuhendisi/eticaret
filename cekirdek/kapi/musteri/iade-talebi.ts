// POST /kapi/musteri/iade-talebi ve POST /kapi/musteri/siparis-iptali (kart 0239, karar 0151; uç belgesi:
// cekirdek/kapi/uclar.md). Giriş yapmış müşteri kendi siparişi için iade talebi açar ya da siparişini, ayar izin
// veriyorsa, kendisi iptal eder. Sipariş yalnız kendi hesabıyla verilmişse bulunur; kimlik yalnız kapıdan gelir. Uç
// yalnız yönlendirir: kurallar iade talebi servisindedir (cekirdek/moduller/siparis/iade-talebi.ts).
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { iadeTalebiServisi } from "../../moduller/siparis/iade-talebi.ts";
import {
  iadeTalebiFormuSemasi,
  musteriIptaliSemasi,
} from "../../moduller/siparis/iade-talebi-semalari.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { ucTanimla } from "../uc.ts";

export const uyeIadeTalebiUcu = ucTanimla({
  giris: "musteri",
  sema: iadeTalebiFormuSemasi,
  izin: "siparis.kendi.iade-talebi",
  sinir: "siki",
  isle: (girdi, _istek, _yanit, { hesapKimligi }) =>
    iadeTalebiServisi(calisanSite()).talepAc(
      siteninVeritabani(),
      { tur: "musteri", musteri: hesapKimligi },
      girdi,
    ),
});

export const uyeSiparisIptaliUcu = ucTanimla({
  giris: "musteri",
  sema: musteriIptaliSemasi,
  izin: "siparis.kendi.iptal",
  sinir: "siki",
  isle: (girdi, _istek, _yanit, { hesapKimligi }) =>
    iadeTalebiServisi(calisanSite()).musteriIptali(
      siteninVeritabani(),
      { tur: "musteri", musteri: hesapKimligi },
      girdi,
    ),
});
