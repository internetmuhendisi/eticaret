// Kargo ayarları (kart 0212, karar 0135): kargo ücreti, ücretsiz kargo sınırı, sınırın hangi tutara bakacağı ve
// kargoya verme süresi.
// Ayarlar mağaza ayarlarındadır (magazaAyarSemasi), yalnız mağaza ayarları servisiyle yazılır: her değişiklik
// değişiklik kaydına girer, aynı kalan değer girmez. Hesabın kendisi hesap.ts'dedir (kargoHesapla).
//
// Panel tutarı sitenin para biçimiyle yazar; burada biçimleyicinin paraOku'suyla kuruşa çevrilir. Okunamayan ya da
// sınır dışı tutar alanın koduyla döner (dogrulama), hiçbir ayar değişmez.

import { magazaAyarSemasi } from "../../ayar-semasi/ayarlar.ts";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import { sepetTutariEnCok, type UcretsizKargoTutari } from "../../kayitlar/sepet.ts";
import { siteninBicimleyicisi } from "../../metinler/site-metni.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { siteninServisi } from "../magaza-ayarlari/servis.ts";
import type { KargoAyarlariGirdisi } from "./semalar.ts";

export type KargoAyarlari = {
  kargoUcreti: number;
  ucretsizKargoSiniri?: number;
  ucretsizKargoTutari: UcretsizKargoTutari;
  kargoyaVermeSuresi: number;
};

// Alanın hata kodları: panel metnini koda göre seçer.
export const kargoAyariHatalari = ["tutar-okunamadi", "tutar-sinir-disi", "gun-gecersiz"] as const;
export type KargoAyariHatasi = (typeof kargoAyariHatalari)[number];

export const kargoAyarlariniOku = async (vt: Veritabani, site: Site): Promise<KargoAyarlari> => {
  const ayarlar = await siteninServisi(site).oku(vt);
  return {
    kargoUcreti: ayarlar.kargoUcreti,
    ...(ayarlar.ucretsizKargoSiniri === undefined
      ? {}
      : { ucretsizKargoSiniri: ayarlar.ucretsizKargoSiniri }),
    ucretsizKargoTutari: ayarlar.ucretsizKargoTutari,
    kargoyaVermeSuresi: ayarlar.kargoyaVermeSuresi,
  };
};

export const kargoAyarlariniDegistir = async (
  vt: Veritabani,
  site: Site,
  kim: DegisikligiYapan,
  girdi: KargoAyarlariGirdisi,
): Promise<KargoAyarlari> => {
  const bicim = siteninBicimleyicisi(site.ayarlar);
  const hatalar: { alan: string; kod: KargoAyariHatasi }[] = [];
  // Ücret 0 olabilir (kargo ücretsiz); sınır en az bir kuruştur.
  const oku = (alan: string, yazi: string, enAz: number): number | undefined => {
    const tutar = bicim.paraOku(yazi);
    if (tutar === undefined) hatalar.push({ alan, kod: "tutar-okunamadi" });
    else if (tutar < enAz || tutar > sepetTutariEnCok)
      hatalar.push({ alan, kod: "tutar-sinir-disi" });
    else return tutar;
    return undefined;
  };
  const kargoUcreti = oku("kargoUcreti", girdi.kargoUcreti, 0);
  const ucretsizKargoSiniri =
    girdi.ucretsizKargoSiniri === ""
      ? undefined
      : oku("ucretsizKargoSiniri", girdi.ucretsizKargoSiniri, 1);
  // Kargoya verme süresi tam gün sayısıdır; sınırı ayarın şemasındadır.
  const gun = /^\d{1,3}$/.test(girdi.kargoyaVermeSuresi)
    ? Number(girdi.kargoyaVermeSuresi)
    : undefined;
  const kargoyaVermeSuresi =
    gun !== undefined && magazaAyarSemasi.shape.kargoyaVermeSuresi.safeParse(gun).success
      ? gun
      : undefined;
  if (kargoyaVermeSuresi === undefined)
    hatalar.push({ alan: "kargoyaVermeSuresi", kod: "gun-gecersiz" });
  if (hatalar.length > 0 || kargoUcreti === undefined || kargoyaVermeSuresi === undefined)
    throw new BilinenHata("dogrulama", hatalar);
  await siteninServisi(site).degistir(vt, kim, {
    kargoUcreti,
    ucretsizKargoSiniri,
    ucretsizKargoTutari: girdi.ucretsizKargoTutari,
    kargoyaVermeSuresi,
  });
  return kargoAyarlariniOku(vt, site);
};
