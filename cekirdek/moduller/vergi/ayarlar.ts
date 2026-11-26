// Vergi ekranının genel ayarları (kart 0322): vergi açık-kapalı, vergi adı, fiyatın gösterimi ve yanındaki metin,
// verginin adresi, yuvarlama ve kargonun vergi sınıfı. Ayarlar mağaza ayarlarıdır (ayarlar.ts) ve yalnız mağaza ayarları
// servisiyle yazılır; kargonun sınıfı vergi tablosundadır, vergi servisiyle yazılır. Fiyat girişi burada değişmez:
// kayıtlı fiyatların çevrilmesi kart 0326'nın işidir.
//
// Hata: alanı belli olan sorun `dogrulama` ile alanın adı ve koduyla döner, hiçbir şey yazılmadan.

import { magazaAyarSemasi } from "../../ayar-semasi/ayarlar.ts";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { kimligiDuzelt } from "../../veritabani/kimlik-bicimi.ts";
import { siteninServisi } from "../magaza-ayarlari/servis.ts";
import {
  type FiyatGirisi,
  type VergiAdresi,
  type VergiYuvarlama,
  vergiAdiSemasi,
} from "./semalar.ts";
import { siteninVergiServisi } from "./servis.ts";
import type { FiyatEkMetniTuru, VergiAyarlariGirdisi } from "./uc-semalari.ts";

export type VergiAyarlari = {
  vergiAcik: boolean;
  vergiAdi: string;
  fiyatGirisi: FiyatGirisi;
  fiyatGosterimi: FiyatGirisi;
  fiyatEkMetniTuru: FiyatEkMetniTuru;
  fiyatEkMetni: string;
  vergiAdresi: VergiAdresi;
  vergiYuvarlama: VergiYuvarlama;
  kargoSinifi: string | null;
};

export const vergiAyarlariniOku = async (vt: Veritabani, site: Site): Promise<VergiAyarlari> => {
  const [ayarlar, tablo] = await Promise.all([
    siteninServisi(site).oku(vt),
    siteninVergiServisi(site).tabloyuOku(vt, { silinmisSiniflar: true }),
  ]);
  const ek = ayarlar.fiyatEkMetni;
  return {
    vergiAcik: ayarlar.vergiAcik,
    vergiAdi: ayarlar.vergiAdi ?? "",
    fiyatGirisi: ayarlar.fiyatGirisi,
    fiyatGosterimi: ayarlar.fiyatGosterimi,
    fiyatEkMetniTuru: ek === undefined ? "otomatik" : ek === "" ? "yok" : "kendi",
    fiyatEkMetni: ek ?? "",
    vergiAdresi: ayarlar.vergiAdresi,
    vergiYuvarlama: ayarlar.vergiYuvarlama,
    kargoSinifi: tablo.find((sinif) => sinif.kargo)?.kimlik ?? null,
  };
};

export const vergiAyarlariniDegistir = async (
  vt: Veritabani,
  site: Site,
  kim: DegisikligiYapan,
  girdi: VergiAyarlariGirdisi,
): Promise<VergiAyarlari> => {
  // "Kendi" metni ayarın kendi şemasından geçer (uzunluk, kayda uygunluk); boş kendi metni alanın hatasıdır, hiçbir
  // şey göstermemek "yok" türüdür.
  const sorunlar: { alan: string; kod: string }[] = [];
  // Vergi adı sınıf ve oran adlarının kuralıyla (vergiAdiSemasi): uzun, "@" ya da kaydın reddettiği değer. Boş ad
  // ayarı kaldırır: ayar isteğe bağlıdır, metin vergi adı olmadan kurulur.
  const adYazisi = girdi.vergiAdi.trim();
  const ad = adYazisi === "" ? undefined : vergiAdiSemasi.safeParse(adYazisi);
  if (ad !== undefined && !ad.success) {
    const sorun = ad.error.issues[0];
    sorunlar.push({
      alan: "vergiAdi",
      kod: sorun?.code === "custom" ? sorun.message : (sorun?.code ?? "gecersiz"),
    });
  }
  let fiyatEkMetni: string | undefined;
  if (girdi.fiyatEkMetniTuru === "kendi") {
    const sonuc = magazaAyarSemasi.shape.fiyatEkMetni.safeParse(girdi.fiyatEkMetni);
    if (!sonuc.success || sonuc.data === undefined || sonuc.data === "") {
      sorunlar.push({ alan: "fiyatEkMetni", kod: sonuc.success ? "too_small" : "gecersiz" });
    } else fiyatEkMetni = sonuc.data;
  } else fiyatEkMetni = girdi.fiyatEkMetniTuru === "yok" ? "" : undefined;
  // Kargonun sınıfı yazmadan önce denetlenir: silinmiş ya da olmayan sınıf hiçbir şey yazmadan alanın hatasıdır.
  // Yazım sırası ayarlar, sonra kargo sınıfıdır; ikisi ayrı işlemlerdedir (mağaza ayarları ve vergi tablosu kendi
  // kilitleriyle yazar). Arada silinen sınıf yine alanın hatasını alır, o durumda ayarlar yazılmış kalır.
  if (girdi.kargoSinifi !== null) {
    const etkin = await siteninVergiServisi(site).tabloyuOku(vt);
    if (!etkin.some((sinif) => sinif.kimlik === kimligiDuzelt(girdi.kargoSinifi ?? ""))) {
      sorunlar.push({ alan: "kargoSinifi", kod: "sinif-silinmis" });
    }
  }
  if (sorunlar.length > 0) throw new BilinenHata("dogrulama", sorunlar);
  const vergiAdi = adYazisi === "" ? undefined : adYazisi;
  await siteninServisi(site).degistir(vt, kim, {
    vergiAcik: girdi.vergiAcik,
    vergiAdi,
    fiyatGosterimi: girdi.fiyatGosterimi,
    fiyatEkMetni,
    vergiAdresi: girdi.vergiAdresi,
    vergiYuvarlama: girdi.vergiYuvarlama,
  });
  try {
    await siteninVergiServisi(site).kargoSinifiniDegistir(vt, kim, girdi.kargoSinifi);
  } catch (hata) {
    // Olmayan ya da silinmiş sınıf alanın hatasıdır: ekran onu kargo sınıfının altında yazar.
    if (hata instanceof BilinenHata && (hata.kod === "bulunamadi" || hata.kod === "is-kurali")) {
      throw new BilinenHata("dogrulama", [{ alan: "kargoSinifi", kod: "sinif-silinmis" }]);
    }
    throw hata;
  }
  return vergiAyarlariniOku(vt, site);
};
