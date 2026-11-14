// Tema demosunda ziyaretçi yalnız gezer (kart 0116, karar 0127, site ayarı temaDemosu): müşterinin hesabına giden
// sayfalar (giriş, kayıt, şifre sıfırlama) yoktur, uçlar da kapalıdır (cekirdek/kapi/uc.ts). Sayfa bunu yalnız
// buradan sorar.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { calisanSite } from "../ayar-semasi/calisan-site";
import { bulunamadiSayfaBilgisi } from "../moduller/gorunurluk/sayfa-bilgisi";

export const yalnizGezintiMi = (): boolean => calisanSite().ayarlar.temaDemosu;

// Müşterinin hesabına giden sayfanın kapısı: tema demosunda bulunamadı.
export const musteriSayfasiniAc = (): void => {
  if (yalnizGezintiMi()) notFound();
};

// Müşterinin hesabına giden sayfanın sekme bilgisi: tema demosunda bulunamadı sayfasınınki (karar 0104).
export const musteriSayfasiBilgisi = (bilgi: () => Promise<Metadata>) => (): Promise<Metadata> =>
  yalnizGezintiMi() ? bulunamadiSayfaBilgisi() : bilgi();
