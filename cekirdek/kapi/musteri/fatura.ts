// GET /kapi/musteri/siparis-faturasi?numara= (kart 0268, karar 0170; uç belgesi: cekirdek/kapi/uclar.md). Giriş yapmış
// müşteri kendi siparişinin faturasını indirir. Sipariş yalnız kendi hesabıyla verilmişse bulunur; kimlik yalnız
// kapıdan gelir. Başka müşterinin, dosyasız ya da olmayan siparişte bulunamadı.
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { siparisFaturaServisi } from "../../moduller/siparis/fatura.ts";
import { siparisAyrintisiSemasi } from "../../moduller/siparis/semalar.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { ucTanimla } from "../uc.ts";
import { BilinenHata, DosyaYaniti } from "../zarf.ts";

export const uyeFaturaDosyasiUcu = ucTanimla({
  giris: "musteri",
  sema: siparisAyrintisiSemasi,
  izin: "siparis.kendi.fatura",
  sinir: "genel",
  isle: async ({ numara }, _istek, _yanit, { hesapKimligi }) => {
    const belge = await siparisFaturaServisi(calisanSite()).dosyaOku(siteninVeritabani(), {
      numara,
      musteri: hesapKimligi,
    });
    if (belge === undefined) throw new BilinenHata("bulunamadi");
    return new DosyaYaniti(
      belge.icerik,
      belge.mime,
      belge.ozet,
      "ozel",
      `fatura-${belge.siparis}.pdf`,
    );
  },
});
