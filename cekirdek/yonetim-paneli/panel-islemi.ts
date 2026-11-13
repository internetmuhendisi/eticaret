"use client";
// Panel ekranlarının değiştiren işlemi (kart 0143; kart 0142'nin ekranından taşındı): uca gönderir, başarıda
// sayfanın verisini sunucudan yeniden okur (router.refresh) ve bildirir; hatada (formda değilse) hatanın metnini
// bildirir. Liste ekrandakinden farklıysa (kayıt yok, arada değişti) güncel hâl okunur. Hatanın metnini ekran seçer.
import { useRouter } from "next/navigation";
import { type BildirimEylemi, bildirimGoster } from "../../bilesenler/parcalar/bildirim";
import { useMetin } from "../metinler/istemci-metni";
import type { MetinAnahtari } from "../metinler/metin";
import { type PanelHatasi, type PanelSonucu, panelIstegi } from "./panel-istegi";

export type IslemSecenekleri<Veri> = {
  // Formun kaydı: hatayı form kendisi gösterir, bildirim verilmez (aynı hata iki kez duyulmasın).
  formda?: boolean;
  // Başarı bildiriminin eylemi ("Geri al"); yanıtın verisinden kurulur.
  eylem?: (veri: Veri) => BildirimEylemi | undefined;
};

export const usePanelIslemi = (hataMetni: (hata: PanelHatasi) => MetinAnahtari) => {
  const metin = useMetin();
  const router = useRouter();
  return async <Veri = Record<string, unknown>>(
    yol: string,
    govde: unknown,
    basari: MetinAnahtari,
    secenekler: IslemSecenekleri<Veri> = {},
  ): Promise<PanelSonucu<Veri>> => {
    const sonuc = await panelIstegi<Veri>(yol, govde);
    if (sonuc.tamam) {
      router.refresh();
      bildirimGoster("basari", metin(basari), secenekler.eylem?.(sonuc.veri));
      return sonuc;
    }
    if (sonuc.kod === "bulunamadi" || sonuc.kod === "cakisma") router.refresh();
    if (secenekler.formda !== true) bildirimGoster("tehlike", metin(hataMetni(sonuc)));
    return sonuc;
  };
};
