// Menü uçlarının hata kodlarının paneldeki metni (kart 0143). Menünün kodları (menuHatalari) kendi metinleriyle
// (menuHataMetinleri) gösterilir; formun alan hataları alanın altında, öteki hatalar formun üstünde ya da
// bildirimde.
import type { MetinAnahtari } from "../../metinler/metin";
import { type MenuHatasi, menuHataMetinleri } from "../../moduller/menu/semalar";
import type { PanelHatasi } from "../panel-istegi";

const menuKoduMu = (kod: string): kod is MenuHatasi => Object.hasOwn(menuHataMetinleri, kod);

// Alanın hatası: menünün kodu ya da şemanın kendi kodu.
const alanHatasiMetni = (kod: string): MetinAnahtari =>
  menuKoduMu(kod)
    ? menuHataMetinleri[kod]
    : kod === "invalid_type" || kod === "too_small"
      ? "yonetim.bolumFormu.hata.zorunlu"
      : kod === "too_big"
        ? "yonetim.bolumFormu.hata.uzun"
        : "yonetim.bolumFormu.hata.gecersiz";

// Formun alanlarının hataları: alan yolundan ("metin", "hedef.adres", "ust") metin anahtarına. Yalnız formda olan
// alanlar (alanlar, ya da onların altı) eşlenir: "menu-dolu", "menu-sayisi" gibi formda alanı olmayan hata
// alana bağlanmaz, formun üstünde kendi metniyle görünür (bağımsız kontrolün bulgusu). esle, servisin alanını
// formun alanına çevirir (menünün kodu adından üretilir: kodun hatası adın altında).
export const menuAlanHatalari = (
  hata: PanelHatasi,
  alanlar: readonly string[],
  esle: Readonly<Record<string, string>> = {},
): Record<string, MetinAnahtari> => {
  const sonuc: Record<string, MetinAnahtari> = {};
  for (const { alan: gelen, kod } of hata.ayrinti) {
    const alan = esle[gelen] ?? gelen;
    if (!alanlar.some((aday) => alan === aday || alan.startsWith(`${aday}.`))) continue;
    sonuc[alan] ??= alanHatasiMetni(kod);
  }
  return sonuc;
};

export const menuHataMetni = (hata: PanelHatasi): MetinAnahtari => {
  if (hata.kod === "ag") return "yonetim.menu.agHatasi";
  if (hata.kod === "oturum-yok") return "yonetim.menu.oturumHatasi";
  if (hata.kod === "yetki") return "yonetim.menu.yetkiHatasi";
  if (hata.kod === "bulunamadi") return "yonetim.menu.bulunamadi";
  const kod = hata.ayrinti.find((sorun) => menuKoduMu(sorun.kod))?.kod;
  if (kod !== undefined && menuKoduMu(kod)) return menuHataMetinleri[kod];
  if (hata.kod === "dogrulama") return "yonetim.menu.form.hata";
  return "yonetim.menu.genelHata";
};
