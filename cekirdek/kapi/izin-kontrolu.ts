// Kapının her istekteki izin kontrolü (kart 0026, karar 0040). Oturumu istekten okur, izni
// sorar, işi yapan servise hesabın kimliğini ve iznin kapsamını verir. Girişsiz istek "oturum-yok",
// izni olmayan "yetki" alır. Beklenmeyen bir birleşim de reddedilir: tür kontrolü geçilse bile
// kontrolsüz uç açılmaz.
import { calisanSite } from "../ayar-semasi/calisan-site.ts";
import {
  type GirisIzni,
  type HerkeseAcik,
  herkeseAcik,
  type IzinAdi,
  type IzinKapsami,
  izinler,
} from "../kayitlar/izinler.ts";
import type { Kapi } from "../kayitlar/kapi.ts";
import type { HesapTuru } from "../kayitlar/oturum.ts";
import { yoneticininIzniVarMi } from "../moduller/ekip/servis.ts";
import { siteninVeritabani } from "../veritabani/baglanti.ts";
import { istektenOturumAl, oturumSuresiSaniye } from "./oturum-cerezi.ts";
import { BilinenHata } from "./zarf.ts";

// Servis başka hesabın kimliğini buradan alamaz: müşteri için kimlik yalnız kendi oturumudur.
export type Erisim = { hesapKimligi: string; kapsam: IzinKapsami };

export type UcErisimi<Giris extends Kapi> = Giris extends "herkese-acik" ? null : Erisim;

const girisHesabi: Partial<Record<Kapi, HesapTuru>> = { yonetici: "yonetici", musteri: "musteri" };

const izniVarMi: Record<HesapTuru, (hesapKimligi: string, izin: IzinAdi) => Promise<boolean>> = {
  // İznin bu girişe ait olduğu erisimiDenetle içinde denetlendi.
  yonetici: (hesapKimligi, izin) =>
    yoneticininIzniVarMi(siteninVeritabani(), hesapKimligi, izin as GirisIzni<"yonetici">),
  // Müşterinin rolü yoktur: geçerli oturumu olan her müşteri müşteri girişinin izinlerine sahiptir.
  musteri: async () => true,
};

export const erisimiDenetle = async (
  giris: Kapi,
  izin: HerkeseAcik | IzinAdi,
  istek: Request,
  cerezYaz: (...cerezler: string[]) => void,
): Promise<Erisim | null> => {
  if (giris === "herkese-acik") {
    if (izin !== herkeseAcik) throw new BilinenHata("yetki");
    return null;
  }
  const tur = girisHesabi[giris];
  if (tur === undefined || izin === herkeseAcik || izinler[izin]?.giris !== giris) {
    throw new BilinenHata("yetki");
  }

  const { hesapKimligi, cerezler } = await istektenOturumAl(
    siteninVeritabani(),
    tur,
    istek,
    oturumSuresiSaniye(tur, calisanSite().ayarlar),
  );
  cerezYaz(...cerezler);
  if (hesapKimligi === null) throw new BilinenHata("oturum-yok");
  if (!(await izniVarMi[tur](hesapKimligi, izin))) throw new BilinenHata("yetki");
  return { hesapKimligi, kapsam: izinler[izin].kapsam };
};
