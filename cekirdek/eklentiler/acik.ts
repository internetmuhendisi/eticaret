// Bir eklentinin sitede açık olup olmadığı (kart 0144, karar 0117). Eklentinin kodu çekirdektedir; sitede yalnız
// altyapı sahibinin `eklentiler` ayarında yazılıysa açıktır. Eklentinin her bağlantı noktası (vitrin yuvası, uç,
// panel sayfası, arka plan işi) açıklığı yalnız buradan sorar.
import type { SiteAyarlari } from "../ayar-semasi/ayarlar.ts";
import type { EklentiKodu } from "../kayitlar/eklentiler.ts";

export const eklentiAcikMi = (
  site: { ayarlar: Pick<SiteAyarlari, "eklentiler"> },
  kod: EklentiKodu,
): boolean => site.ayarlar.eklentiler.includes(kod);
