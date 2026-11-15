// Tema uçlarının hata kodlarının paneldeki metni (kart 0148). Sunucu kod döndürür, metni ekran seçer
// (.claude/rules/metinler.md).
import type { MetinAnahtari } from "../../metinler/metin";
import type { PanelHatasi } from "../panel-istegi";

// Tema ekranının kullandığı yönetici uçları (uç belgesi: cekirdek/kapi/uclar.md), tek yerde.
export const temaUclari = {
  yayinla: "tema",
  geriDon: "tema-geri-don",
} as const;

export const temaHatasiMetni = (hata: PanelHatasi): MetinAnahtari => {
  const ayrinti = hata.ayrinti.map((sorun) => sorun.kod);
  if (hata.kod === "ag") return "yonetim.tema.hata.ag";
  if (hata.kod === "oturum-yok") return "yonetim.tema.hata.oturum";
  if (hata.kod === "yetki") return "yonetim.tema.hata.yetki";
  if (ayrinti.includes("katalog-bekleniyor")) return "yonetim.tema.hata.katalog";
  if (ayrinti.includes("tema-degistirilemez")) return "yonetim.tema.hata.degistirilemez";
  if (ayrinti.includes("tema-kullanilamaz")) return "yonetim.tema.hata.kullanilamaz";
  if (ayrinti.includes("tema-degisti")) return "yonetim.tema.hata.temaDegisti";
  if (ayrinti.includes("surum-gecersiz")) return "yonetim.tema.hata.oncekiYok";
  if (ayrinti.includes("surum-kullanilamaz")) return "yonetim.tema.hata.surumKullanilamaz";
  return "yonetim.tema.hata.genel";
};
