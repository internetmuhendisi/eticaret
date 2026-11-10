// Tema değişikliğinde düzenin iki yolu (kart 0113, karar 0091). Düz işlevler: veritabanına gitmez, tema
// servisi sonucu düzen sürümü olarak yazar.
//
// - koru: düzen aynen kalır. Görünümü kütüphanede olmayan bölüm türünün ilk (varsayılan) görünümüne düşer,
//   bölüm silinmez. Türü kütüphanede olmayan bölüme dokunulmaz.
// - uygula: yeni temanın başlangıç düzeni kurulur. Yeni düzendeki her bölüm, aynı alanda aynı türden henüz
//   kullanılmamış ilk eski bölümün içeriğini alır: kimliği, alan değerleri ve görünürlüğü taşınır, görünümü
//   yeni temanınkidir (kullanıcı kararı). Karşılığı olmayan eski bölümler silinmez: alanın sonuna gizli
//   olarak eklenir. Alan sınırına (50) sığmayanlar yalnız geçmişte kalır, kayda kimlikleriyle girer.
//
// İçerik hiçbir yolda silinmez: bölümün başvurduğu görsel, ürün, kategori ve menüye dokunulmaz.
import type { DuzenAlani } from "../../kayitlar/tema.ts";
import { duzenAlanlari } from "../../kayitlar/tema.ts";
import {
  alandakiEnCokBolum,
  type BaslangicDuzeni,
  type BolumKutuphanesi,
  type BolumOrnegi,
  baslangictanDuzen,
  bosDuzen,
  type Duzen,
} from "../../vitrin/bolum-kutuphanesi/duzen.ts";

export const duzenYollari = ["uygula", "koru"] as const;
export type DuzenYolu = (typeof duzenYollari)[number];

export type GecisSonucu = {
  duzen: Duzen;
  // Görünümü varsayılana düşen bölümler.
  varsayilanaDusen: string[];
  // İçeriği yeni temanın bölümüne taşınan eski bölümler (uygula).
  tasinan: string[];
  // Karşılığı olmadığı için gizli olarak eklenen eski bölümler (uygula).
  gizlenen: string[];
  // Alan sınırına sığmadığı için yalnız geçmişte kalan eski bölümler (uygula).
  disaridaKalan: string[];
};

// Görünümü kütüphanede yoksa türün ilk görünümü. Türü kütüphanede yoksa bölüm olduğu gibi kalır.
const gorunumuDuzelt = (
  bolum: BolumOrnegi,
  kutuphane: BolumKutuphanesi,
): { bolum: BolumOrnegi; dustu: boolean } => {
  const tarif = Object.hasOwn(kutuphane, bolum.tur) ? kutuphane[bolum.tur] : undefined;
  if (tarif === undefined || tarif.gorunumler.some((gorunum) => gorunum.kod === bolum.gorunum)) {
    return { bolum, dustu: false };
  }
  return { bolum: { ...bolum, gorunum: tarif.gorunumler[0].kod }, dustu: true };
};

export const duzeniKoru = (eski: Duzen, kutuphane: BolumKutuphanesi): GecisSonucu => {
  const duzen = bosDuzen();
  const varsayilanaDusen: string[] = [];
  for (const alan of duzenAlanlari) {
    for (const bolum of eski[alan]) {
      const sonuc = gorunumuDuzelt(bolum, kutuphane);
      if (sonuc.dustu) varsayilanaDusen.push(bolum.kimlik);
      duzen[alan].push(sonuc.bolum);
    }
  }
  return { duzen, varsayilanaDusen, tasinan: [], gizlenen: [], disaridaKalan: [] };
};

export const temaDuzeniniUygula = (
  eski: Duzen,
  yeniBaslangic: BaslangicDuzeni,
  kutuphane: BolumKutuphanesi,
  yeniKimlik: () => string,
): GecisSonucu => {
  const yeni = baslangictanDuzen(yeniBaslangic, kutuphane, yeniKimlik);
  const duzen = bosDuzen();
  const sonuc: Omit<GecisSonucu, "duzen"> = {
    varsayilanaDusen: [],
    tasinan: [],
    gizlenen: [],
    disaridaKalan: [],
  };
  for (const alan of duzenAlanlari as readonly DuzenAlani[]) {
    const kalanlar = [...eski[alan]];
    for (const bolum of yeni[alan]) {
      const sira = kalanlar.findIndex((eskiBolum) => eskiBolum.tur === bolum.tur);
      const karsilik = kalanlar[sira];
      if (karsilik === undefined) {
        duzen[alan].push(bolum);
        continue;
      }
      kalanlar.splice(sira, 1);
      sonuc.tasinan.push(karsilik.kimlik);
      duzen[alan].push({
        ...bolum,
        kimlik: karsilik.kimlik,
        gizli: karsilik.gizli,
        degerler: karsilik.degerler,
      });
    }
    for (const bolum of kalanlar) {
      if (duzen[alan].length >= alandakiEnCokBolum) {
        sonuc.disaridaKalan.push(bolum.kimlik);
        continue;
      }
      const duzeltilen = gorunumuDuzelt(bolum, kutuphane);
      if (duzeltilen.dustu) sonuc.varsayilanaDusen.push(bolum.kimlik);
      sonuc.gizlenen.push(bolum.kimlik);
      duzen[alan].push({ ...duzeltilen.bolum, gizli: true });
    }
  }
  return { duzen, ...sonuc };
};
