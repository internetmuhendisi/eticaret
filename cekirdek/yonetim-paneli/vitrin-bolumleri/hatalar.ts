// Düzen uçlarının hata kodlarının paneldeki metni (kart 0142). Sunucu kod döndürür, metni ekran seçer
// (.claude/rules/metinler.md). Bölüm değerlerinin hatası alanın yoluyla gelir ("degerler.slaytlar.0.baslik"):
// formdaki alanın altında gösterilir; ötekiler formun üstünde ya da bildirimde.
import type { MetinAnahtari } from "../../metinler/metin";
import type { PanelHatasi } from "../panel-istegi";

const degerOneki = "degerler.";

// Alan hatasının kodu: bölüm tarifinin denetimi (bolumAlanHatalari) ya da şemanın kendi kodu (Zod).
const alanHatasiMetni = (kod: string): MetinAnahtari => {
  switch (kod) {
    case "invalid_type":
    case "too_small":
      return "yonetim.bolumFormu.hata.zorunlu";
    case "too_big":
      return "yonetim.bolumFormu.hata.uzun";
    case "baglanti-gecersiz":
      return "yonetim.bolumFormu.hata.baglanti";
    case "denetim-karakteri":
      return "yonetim.bolumFormu.hata.karakter";
    case "tarih-gecersiz":
      return "yonetim.bolumFormu.hata.tarih";
    case "ayni-urun-iki-kez":
      return "yonetim.bolumFormu.hata.ayniUrun";
    case "kayit-yok":
      return "yonetim.bolumFormu.hata.kayitYok";
    case "gorsel-gecersiz":
      return "yonetim.bolumFormu.hata.gorsel";
    default:
      return "yonetim.bolumFormu.hata.gecersiz";
  }
};

// Formun alanlarının hataları: alan yolundan metin anahtarına. Aynı alanın ilk hatası gösterilir.
export const alanHatalari = (hata: PanelHatasi): Record<string, MetinAnahtari> => {
  const sonuc: Record<string, MetinAnahtari> = {};
  if (hata.kod !== "dogrulama") return sonuc;
  for (const { alan, kod } of hata.ayrinti) {
    if (!alan.startsWith(degerOneki)) continue;
    const yol = alan.slice(degerOneki.length);
    sonuc[yol] ??= alanHatasiMetni(kod);
  }
  return sonuc;
};

// İşlemin genel hatası: formun üstündeki uyarının ya da bildirimin metni.
export const islemHatasiMetni = (hata: PanelHatasi): MetinAnahtari => {
  const ayrinti = hata.ayrinti.map((sorun) => sorun.kod);
  if (hata.kod === "ag") return "yonetim.bolumler.hata.ag";
  if (hata.kod === "oturum-yok") return "yonetim.bolumler.hata.oturum";
  if (hata.kod === "yetki") return "yonetim.bolumler.hata.yetki";
  if (hata.kod === "bulunamadi") return "yonetim.bolumler.hata.bulunamadi";
  if (ayrinti.includes("katalog-bekleniyor")) return "yonetim.bolumler.hata.katalog";
  if (ayrinti.includes("duzen-degisti")) return "yonetim.bolumler.hata.duzenDegisti";
  if (ayrinti.includes("tema-degisikligi")) return "yonetim.bolumler.hata.temaDegisikligi";
  if (ayrinti.includes("onceki-surum-yok")) return "yonetim.bolumler.hata.oncekiYok";
  if (ayrinti.includes("surum-kullanilamaz")) return "yonetim.bolumler.hata.surumKullanilamaz";
  if (ayrinti.includes("alan-dolu")) return "yonetim.bolumler.hata.alanDolu";
  if (ayrinti.includes("siralama-gecersiz")) return "yonetim.bolumler.hata.siralama";
  if (hata.kod === "dogrulama") return "yonetim.bolumler.hata.form";
  return "yonetim.bolumler.hata.genel";
};
