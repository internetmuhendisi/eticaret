// Yayınlanan kodların kaydı (kart 0122, karar 0113). Sitelerin veritabanındaki düzen, çekirdeğin herhangi bir eski
// sürümünde yazılmış olabilir: o sürümün tür, görünüm, alan, seçenek ve renk kodlarını taşır. Kayıt
// (yayinlanan-kodlar.json) bugüne kadar yayınlanmış bütün kodları tutar, yalnız büyür. Kayıttaki her kod ya bugünkü
// tarifte ya da tarifin eski kodlarında (eskiKodlar) bugünkü bir karşılıkla durur; böylece eski düzen okunurken
// bölüm sessizce kaybolmaz. Tarife yeni kod eklenince kayda da eklenir. İkisini testler/yayinlanan-kodlar.test.ts
// denetler. Kayıt ilk kez kart 0122'de, 0.37.0'dan 0.62.0'a bütün sürümlerin kütüphanesinden çıkarılarak kuruldu.
import { type BolumKutuphanesi, type KutuphaneKodlari, kutuphaneKodlari } from "./duzen.ts";

// "liste.alt" yolunun üst alanı ("liste"); üst düzeydeki alanınki boştur.
const ustAlan = (yol: string): string => (yol.includes(".") ? (yol.split(".")[0] ?? "") : "");

// Kayıttaki kodlardan bugün karşılığı olmayanlar: kaldırılan ya da adı değişen ve tarifin eski kodlarında bugünkü
// bir karşılıkla yazılmamış her kod. Eşlemenin kendisi de denetlenir: eski kod bugün hâlâ varsa ya da karşılığı
// bugün yoksa sorun sayılır.
export const karsiligiOlmayanlar = (
  kutuphane: BolumKutuphanesi,
  kayit: KutuphaneKodlari,
): string[] => {
  const bugun = kutuphaneKodlari(kutuphane);
  const sorunlar: string[] = [];
  for (const [tur, kodlar] of Object.entries(kayit)) {
    const tarif = Object.hasOwn(kutuphane, tur) ? kutuphane[tur] : undefined;
    const simdi = Object.hasOwn(bugun, tur) ? bugun[tur] : undefined;
    if (tarif === undefined || simdi === undefined) {
      sorunlar.push(`${tur}: tür kaldırılmış; eski düzenlerdeki bölümü çizilmez`);
      continue;
    }
    const eski = tarif.eskiKodlar ?? {};
    for (const gorunum of kodlar.gorunumler) {
      if (simdi.gorunumler.includes(gorunum)) continue;
      const hedef = eski.gorunumler?.[gorunum];
      if (hedef === undefined || !simdi.gorunumler.includes(hedef)) {
        sorunlar.push(`${tur}: görünüm ${gorunum} kaldırılmış, bugünkü karşılığı yok`);
      }
    }
    for (const kod of kodlar.alanlar) {
      if (simdi.alanlar.includes(kod)) continue;
      const [yol = "", secenek] = kod.split("=");
      const alanEslemesi =
        eski.alanlar !== undefined && Object.hasOwn(eski.alanlar, yol)
          ? eski.alanlar[yol]
          : undefined;
      // Alanın kendisi kaldırıldıysa (null) değeri atılır: seçeneğinin karşılığı gerekmez.
      if (alanEslemesi === null) continue;
      if (secenek === undefined) {
        if (alanEslemesi === undefined || !simdi.alanlar.includes(alanEslemesi)) {
          sorunlar.push(`${tur}: alan ${yol} kaldırılmış, bugünkü karşılığı yok`);
        }
        continue;
      }
      const bugunkuYol = alanEslemesi ?? yol;
      const bugunkuSecenek = eski.secenekler?.[bugunkuYol]?.[secenek] ?? secenek;
      if (!simdi.alanlar.includes(`${bugunkuYol}=${bugunkuSecenek}`)) {
        sorunlar.push(
          `${tur}: ${yol} alanının ${secenek} seçeneği kaldırılmış, bugünkü karşılığı yok`,
        );
      }
    }
  }
  // Eşlemenin kendisi: eski kod bugün de varsa eşleme hiç uygulanmaz, yanlış yazılmıştır.
  for (const [tur, tarif] of Object.entries(kutuphane)) {
    const simdi = bugun[tur];
    if (simdi === undefined) continue;
    for (const gorunum of Object.keys(tarif.eskiKodlar?.gorunumler ?? {})) {
      if (simdi.gorunumler.includes(gorunum)) {
        sorunlar.push(`${tur}: eski görünüm ${gorunum} bugün de var`);
      }
    }
    for (const [alan, yeni] of Object.entries(tarif.eskiKodlar?.alanlar ?? {})) {
      if (simdi.alanlar.includes(alan)) sorunlar.push(`${tur}: eski alan ${alan} bugün de var`);
      // Değer eski yerinde, aynı nesnede taşınır: alan ancak aynı üst alanda (üst düzeyde ya da aynı listede)
      // yeni koda gidebilir.
      if (yeni !== null && ustAlan(alan) !== ustAlan(yeni)) {
        sorunlar.push(`${tur}: eski alan ${alan} başka bir üst alana (${yeni}) taşınamaz`);
      }
    }
    for (const [yol, harita] of Object.entries(tarif.eskiKodlar?.secenekler ?? {})) {
      for (const secenek of Object.keys(harita)) {
        if (simdi.alanlar.includes(`${yol}=${secenek}`)) {
          sorunlar.push(`${tur}: ${yol} alanının eski seçeneği ${secenek} bugün de var`);
        }
      }
    }
  }
  return sorunlar;
};

// Bugünkü tarifte olup kayıtta olmayan kodlar: yeni kod kayda eklenmeli, yoksa ileride kaldırılınca yakalanmaz.
export const kayittaOlmayanlar = (kutuphane: BolumKutuphanesi, kayit: KutuphaneKodlari): string[] =>
  Object.entries(kutuphaneKodlari(kutuphane)).flatMap(([tur, kodlar]) => {
    const kayitli = Object.hasOwn(kayit, tur) ? kayit[tur] : undefined;
    if (kayitli === undefined) return [`${tur}: tür kayıtta yok`];
    return [
      ...kodlar.gorunumler
        .filter((kod) => !kayitli.gorunumler.includes(kod))
        .map((kod) => `${tur}: görünüm ${kod} kayıtta yok`),
      ...kodlar.alanlar
        .filter((kod) => !kayitli.alanlar.includes(kod))
        .map((kod) => `${tur}: alan ${kod} kayıtta yok`),
    ];
  });
