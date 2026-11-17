// Kartla ödemeden dönüş (kart 0215, karar 0142). Müşteri "Siparişi onayla"dan sonra ödeme kuruluşunun sayfasına gider;
// ödeme olmazsa ödeme adımına sonucun koduyla döner (?kart=reddedildi). Formun bilgileri gitmeden önce sekmenin
// deposuna yazılır, dönüşte geri konur ve silinir: müşteri formu dolu bulur. Şifre ve onaylar yazılmaz.
import {
  type OdemeDonusSonucu,
  odemeDonusParametresi,
  odemeDonusSonuclari,
} from "../../kayitlar/odeme";

type TaslakAdresi = { ulke: string; il: string; ilce: string; adres: string; postaKodu: string };

export type OdemeTaslagi = {
  eposta: string;
  ad: string;
  soyad: string;
  telefon: string;
  teslimat: TaslakAdresi;
  faturaTuru: "bireysel" | "kurumsal";
  faturaAyni: boolean;
  faturaAdresi: TaslakAdresi;
  firma: string;
  vergiDairesi: string;
  vergiNumarasi: string;
  not: string;
  yontem: string | undefined;
};

const anahtar = "odeme-taslagi";
// Sekmenin deposunda müşterinin bir önceki onayının oturumu (yalnız kimlik): yeniden onayda serbest kalır, kartla
// ödemeden sonra sipariş alındı sayfası sepeti bununla temizler.
export const odemeOturumuAnahtari = "odeme-oturumu";

export const taslagiSakla = (taslak: OdemeTaslagi): void => {
  try {
    window.sessionStorage.setItem(anahtar, JSON.stringify(taslak));
  } catch {
    // Depo kapalıysa müşteri formu yeniden doldurur.
  }
};

const metinMi = (deger: unknown): deger is string => typeof deger === "string";
const adresMi = (deger: unknown): deger is TaslakAdresi =>
  typeof deger === "object" &&
  deger !== null &&
  ["ulke", "il", "ilce", "adres", "postaKodu"].every((alan) =>
    metinMi((deger as Record<string, unknown>)[alan]),
  );

// Depodaki taslak bir kez okunur ve silinir; biçimi bozuksa yok sayılır.
export const taslagiAl = (): OdemeTaslagi | undefined => {
  let ham: string | null = null;
  try {
    ham = window.sessionStorage.getItem(anahtar);
    window.sessionStorage.removeItem(anahtar);
  } catch {
    return undefined;
  }
  if (ham === null) return undefined;
  try {
    const t = JSON.parse(ham) as Record<string, unknown>;
    const metinler = [
      "eposta",
      "ad",
      "soyad",
      "telefon",
      "firma",
      "vergiDairesi",
      "vergiNumarasi",
      "not",
    ];
    if (
      !metinler.every((alan) => metinMi(t[alan])) ||
      !adresMi(t["teslimat"]) ||
      !adresMi(t["faturaAdresi"]) ||
      (t["faturaTuru"] !== "bireysel" && t["faturaTuru"] !== "kurumsal") ||
      typeof t["faturaAyni"] !== "boolean" ||
      !(t["yontem"] === undefined || metinMi(t["yontem"]))
    ) {
      return undefined;
    }
    return t as OdemeTaslagi;
  } catch {
    return undefined;
  }
};

// Adresteki dönüş sonucu; okununca adresten kaldırılır (yenileyince hata yeniden görünmez).
export const donusSonucunuAl = (): OdemeDonusSonucu | undefined => {
  const adres = new URL(window.location.href);
  const deger = adres.searchParams.get(odemeDonusParametresi);
  if (deger === null) return undefined;
  adres.searchParams.delete(odemeDonusParametresi);
  window.history.replaceState(window.history.state, "", adres.pathname + adres.search + adres.hash);
  return (odemeDonusSonuclari as readonly string[]).includes(deger)
    ? (deger as OdemeDonusSonucu)
    : undefined;
};
