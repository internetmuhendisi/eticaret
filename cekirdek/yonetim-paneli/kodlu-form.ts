"use client";
// Kodlu hata döndüren modüllerin panel formu (kart 0261; kalıp menüler ekranından, kart 0143): kategori, marka,
// etiket ve özellik servisleri hatayı alanın yolu ve modülün koduyla döndürür, metni modülün hata metinleri
// kaydındadır (kategoriHataMetinleri gibi). Alan hatası alanın altında, alanı formda olmayan hata özette kendi
// metniyle görünür (ortak form yapısı, karar 0159). Bildirim ve özet için hatanın tek metni hataMetni'dir.
import type { MetinAnahtari } from "../metinler/metin";
import { usePanelMetni } from "../metinler/panel-metni";
import { usePanelFormu } from "./form/panel-formu";
import type { PanelHatasi, PanelSonucu } from "./panel-istegi";

export type KodMetinleri = Readonly<Record<string, MetinAnahtari>>;

const kodluMu = (metinler: KodMetinleri, kod: string): boolean => Object.hasOwn(metinler, kod);

// Alanın hatası: modülün kodu ya da şemanın kendi kodu.
const alanHatasiMetni = (metinler: KodMetinleri, kod: string): MetinAnahtari =>
  kodluMu(metinler, kod)
    ? (metinler[kod] as MetinAnahtari)
    : kod === "invalid_type" || kod === "too_small"
      ? "yonetim.bolumFormu.hata.zorunlu"
      : kod === "too_big"
        ? "yonetim.bolumFormu.hata.uzun"
        : "yonetim.bolumFormu.hata.gecersiz";

// Formun alanlarının hataları: alan yolundan ("ad", "secenekler.2.ad") metin anahtarına. Yalnız formda olan alanlar
// (alanlar, ya da onların altı) eşlenir; esle servisin alanını formun alanına çevirir.
export type AlanEslemesi = (alan: string) => string;
export const kodluAlanHatalari = (
  metinler: KodMetinleri,
  hata: PanelHatasi,
  alanlar: readonly string[],
  esle: AlanEslemesi = (alan) => alan,
): Record<string, MetinAnahtari> => {
  const sonuc: Record<string, MetinAnahtari> = {};
  for (const { alan: gelen, kod } of hata.ayrinti) {
    const alan = esle(gelen);
    if (!alanlar.some((aday) => alan === aday || alan.startsWith(`${aday}.`))) continue;
    sonuc[alan] ??= alanHatasiMetni(metinler, kod);
  }
  return sonuc;
};

// Hatanın tek metni: bildirimde ve alanı olmayan hatada.
export const kodluHataMetni =
  (metinler: KodMetinleri) =>
  (hata: PanelHatasi): MetinAnahtari => {
    if (hata.kod === "ag") return "yonetim.katalogEkrani.hata.ag";
    if (hata.kod === "oturum-yok") return "yonetim.katalogEkrani.hata.oturum";
    if (hata.kod === "yetki") return "yonetim.katalogEkrani.hata.yetki";
    if (hata.kod === "bulunamadi") return "yonetim.katalogEkrani.hata.bulunamadi";
    const kod = hata.ayrinti.find((sorun) => kodluMu(metinler, sorun.kod))?.kod;
    if (kod !== undefined) return metinler[kod] as MetinAnahtari;
    if (hata.kod === "dogrulama") return "yonetim.katalogEkrani.hata.form";
    return "yonetim.katalogEkrani.hata.genel";
  };

// Formun kaydı: ortak form yapısının üstünde modülün hata eşlemesi.
export const useKodluForm = (
  metinler: KodMetinleri,
  alanlar: readonly string[],
  degisti: boolean,
  esle?: AlanEslemesi,
) => {
  const metin = usePanelMetni();
  const pf = usePanelFormu({ degisti });
  const kaydet = async (is: () => Promise<PanelSonucu<unknown>>, bitince: () => void) => {
    const sonuc = await pf.isle(is);
    if (sonuc === undefined) return;
    if (sonuc.tamam) {
      pf.temizle();
      bitince();
      return;
    }
    const alanHatalari = kodluAlanHatalari(metinler, sonuc, alanlar, esle);
    pf.hatalariGoster(
      Object.fromEntries(
        Object.entries(alanHatalari).map(([alan, anahtar]) => [alan, metin(anahtar)]),
      ),
      Object.keys(alanHatalari).length > 0 ? [] : [metin(kodluHataMetni(metinler)(sonuc))],
    );
  };
  return { pf, kaydet };
};
