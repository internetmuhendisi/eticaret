// Elle sipariş ekranının verisi (kart 0236, karar 0148): sitede kullanılabilen ödeme yöntemleri (kartla ödeme panelden
// alınmaz; "elden" yalnız siparis.elden-tahsil izni olana), teslimat ülkeleri, telefonun zorunluluğu ve sınırlar.
import { calisanSite } from "../../ayar-semasi/calisan-site";
import type { GirisIzni } from "../../kayitlar/izinler";
import { odemeSinirlari } from "../../kayitlar/odeme";
import { siteninMagazaAyarlari } from "../../moduller/magaza-ayarlari/servis";
import { kullanilabilirYontemler } from "../../moduller/odeme/yontemler";
import type { ElleSiparisOdemesi } from "../../moduller/siparis/semalar";
import { siteninVeritabani } from "../../veritabani/baglanti";
import type { BolgeUlkesi } from "../../vitrin/odeme/alanlar";
import { teslimatUlkeleri } from "../../vitrin/odeme/ulkeler";

export type ElleSiparisVerisi = {
  yontemler: { anahtar: string; secim: ElleSiparisOdemesi }[];
  havaleIptalSuresi: number;
  telefonZorunlu: boolean;
  ulkeler: BolgeUlkesi[];
  notEnCok: number;
};

export const elleSiparisVerisi = async (
  yetkili: (izin: GirisIzni<"yonetici">) => boolean,
): Promise<ElleSiparisVerisi> => {
  const site = calisanSite();
  const ayarlar = await siteninMagazaAyarlari(siteninVeritabani(), site);
  const yontemler: ElleSiparisVerisi["yontemler"] = kullanilabilirYontemler(site, ayarlar).flatMap(
    (secim) =>
      secim.yontem === "kart"
        ? []
        : [
            {
              anahtar:
                secim.yontem === "kapida-odeme" ? `${secim.yontem}-${secim.secenek}` : secim.yontem,
              secim,
            },
          ],
  );
  if (yetkili("siparis.elden-tahsil"))
    yontemler.push({ anahtar: "elden", secim: { yontem: "elden" } });
  return {
    yontemler,
    havaleIptalSuresi: ayarlar.havaleIptalSuresi,
    telefonZorunlu: ayarlar.telefonZorunlu,
    ulkeler: teslimatUlkeleri(site),
    notEnCok: odemeSinirlari.notEnCok,
  };
};
