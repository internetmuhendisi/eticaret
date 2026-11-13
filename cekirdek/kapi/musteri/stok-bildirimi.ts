// POST /kapi/musteri/stok-bildirimi (kart 0144, karar 0117; uç belgesi: cekirdek/kapi/uclar.md). Giriş yapmış
// müşteri tükenmiş birim için talep bırakır; e-posta hesabındandır, girdiden alınmaz. Müşterinin kimliği yalnız
// kapıdan gelir.
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { uyeStokBildirimiTalebiSemasi } from "../../eklentiler/stoga-gelince-haber-ver/semalar.ts";
import { stokBildirimiServisi } from "../../eklentiler/stoga-gelince-haber-ver/servis.ts";
import { musteriHesabi } from "../../moduller/musteri/servis.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { ucTanimla } from "../uc.ts";
import { BilinenHata } from "../zarf.ts";

export const uyeStokBildirimiUcu = ucTanimla({
  giris: "musteri",
  sema: uyeStokBildirimiTalebiSemasi,
  izin: "stok-bildirimi.kendi.iste",
  sinir: "genel",
  isle: async ({ birim }, _istek, _yanit, { hesapKimligi }) => {
    const vt = siteninVeritabani();
    const hesap = await musteriHesabi(vt, hesapKimligi);
    if (hesap === null) throw new BilinenHata("oturum-yok");
    await stokBildirimiServisi(calisanSite()).talepYaz(vt, birim, hesap.eposta);
    return {};
  },
});
