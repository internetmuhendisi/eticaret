// Raporun dönemi (kart 0317, karar 0195). Adresteki değer hazır dönemin kodu ya da iki gün ("2026-10-01_2026-10-31",
// iki uç da zorunlu, iki uç dahil). Günler sitenin saat dilimindeki takvim günleridir; anlara gününBasi çevirir (kart
// 0267'nin kuralı: yaz saati, gece yarısı yaşanmayan gün). Karşılaştırılan dönem: "bu ay" önceki ayın aynı günleri,
// "geçen ay" ondan önceki ayın tamamı, öteki dönemler aynı uzunlukta hemen önceki günler (kullanıcı kararı, karar 0195).
import {
  type RaporHazirDonemi,
  raporHazirDonemleri,
  raporSinirlari,
} from "../../kayitlar/rapor.ts";
import { gunEkle, gununBasi, takvimGunuMu } from "../../metinler/bicimleyici.ts";

export type RaporDonemDegeri =
  | { tur: "hazir"; kod: RaporHazirDonemi }
  | { tur: "aralik"; baslangic: string; bitis: string };

// İki uç dahil günler.
export type GunAraligi = { baslangic: string; bitis: string };

const ayrac = "_";

// İki gün arasındaki gün sayısı, iki uç dahil.
export const gunSayisi = ({ baslangic, bitis }: GunAraligi): number =>
  Math.round(
    (Date.parse(`${bitis}T00:00:00Z`) - Date.parse(`${baslangic}T00:00:00Z`)) / 86_400_000,
  ) + 1;

// Adresteki değer. Tanınmayan kod, takvimde olmayan ya da eksik gün, ters sıra ve sınırdan uzun aralık undefined
// döner: sayfa varsayılan döneme düşer, uç reddeder.
export const raporDonemDegeriniCoz = (deger: string): RaporDonemDegeri | undefined => {
  if ((raporHazirDonemleri as readonly string[]).includes(deger)) {
    return { tur: "hazir", kod: deger as RaporHazirDonemi };
  }
  const parcalar = deger.split(ayrac);
  if (parcalar.length !== 2) return undefined;
  const [baslangic = "", bitis = ""] = parcalar;
  if (!takvimGunuMu(baslangic) || !takvimGunuMu(bitis) || baslangic > bitis) return undefined;
  if (gunSayisi({ baslangic, bitis }) > raporSinirlari.enCokGun) return undefined;
  return { tur: "aralik", baslangic, bitis };
};

export const raporDonemDegeri = (deger: RaporDonemDegeri): string =>
  deger.tur === "hazir" ? deger.kod : `${deger.baslangic}${ayrac}${deger.bitis}`;

// Dönemin günleri, bugüne göre (sitenin saat dilimindeki takvim günü).
export const donemGunleri = (deger: RaporDonemDegeri, bugun: string): GunAraligi => {
  if (deger.tur === "aralik") return { baslangic: deger.baslangic, bitis: deger.bitis };
  switch (deger.kod) {
    case "bugun":
      return { baslangic: bugun, bitis: bugun };
    case "son-7-gun":
      return { baslangic: gunEkle(bugun, -6), bitis: bugun };
    case "son-30-gun":
      return { baslangic: gunEkle(bugun, -29), bitis: bugun };
    case "bu-ay":
      return { baslangic: `${bugun.slice(0, 8)}01`, bitis: bugun };
    case "gecen-ay": {
      const buAyinIlki = `${bugun.slice(0, 8)}01`;
      const bitis = gunEkle(buAyinIlki, -1);
      return { baslangic: `${bitis.slice(0, 8)}01`, bitis };
    }
  }
};

// Önceki dönem: aynı gün sayısı, dönemin ilk gününden hemen önce.
export const oncekiDonem = (donem: GunAraligi): GunAraligi => {
  const bitis = gunEkle(donem.baslangic, -1);
  return { baslangic: gunEkle(bitis, 1 - gunSayisi(donem)), bitis };
};

// Günlerin anları: ilk günün başı dahil, son günün ertesi gününün başı hariç.
export const donemAnlari = (donem: GunAraligi, saatDilimi: string): { bas: Date; son: Date } => ({
  bas: gununBasi(donem.baslangic, saatDilimi),
  son: gununBasi(gunEkle(donem.bitis, 1), saatDilimi),
});

// Ayın gün sayısı ("YYYY-AA" ile başlayan gün).
const ayinGunSayisi = (gun: string): number => {
  const [yil = 0, ay = 1] = gun.split("-").map(Number);
  return new Date(Date.UTC(yil, ay, 0)).getUTCDate();
};
const oncekiAyinIlki = (gun: string): string =>
  `${gunEkle(`${gun.slice(0, 8)}01`, -1).slice(0, 8)}01`;

// Karşılaştırılan dönem. "Bu ay" (ayın 1'inden bugüne) önceki ayın aynı günleriyle; önceki ay kısaysa son günüyle
// biter (31 Mart'ta 1–29 Şubat). "Geçen ay" ondan önceki ayın tamamıyla. Ötekiler oncekiDonem.
export const karsilastirmaDonemi = (deger: RaporDonemDegeri, donem: GunAraligi): GunAraligi => {
  if (deger.tur === "hazir" && deger.kod === "bu-ay") {
    const baslangic = oncekiAyinIlki(donem.baslangic);
    const gun = Math.min(Number(donem.bitis.slice(8, 10)), ayinGunSayisi(baslangic));
    return { baslangic, bitis: gunEkle(baslangic, gun - 1) };
  }
  if (deger.tur === "hazir" && deger.kod === "gecen-ay") {
    const baslangic = oncekiAyinIlki(donem.baslangic);
    return { baslangic, bitis: gunEkle(baslangic, ayinGunSayisi(baslangic) - 1) };
  }
  return oncekiDonem(donem);
};
