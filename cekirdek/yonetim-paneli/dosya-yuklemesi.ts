"use client";
// Panelin dosya yüklemesi (kart 0094, karar 0165): seçilen dosyayı yükleme ucuna gönderir, ilerlemeyi ve iptali
// tutar. Sınırı aşan dosya istek gitmeden reddedilir (sunucu yine denetler). Sonuç çağırana döner; hatanın metni
// dosyaHatasiMetni ile seçilir. Görüntüsü bilesenler/parcalar/dosya-yukleme.tsx'tir.
import { useRef, useState } from "react";
import type { YuklemeDurumu } from "../../bilesenler/parcalar/dosya-yukleme";
import { dosyaHatalari, dosyaSinirlari } from "../kayitlar/dosya";
import type { MetinAnahtari } from "../metinler/metin";
import { type PanelHatasi, type PanelSonucu, panelYuklemesi } from "./panel-istegi";

// enCokBayt: yüklenen dosyanın sınırı (görsel varsayılan; belge kendi sınırını verir, kart 0268).
export const useDosyaYuklemesi = (enCokBayt: number = dosyaSinirlari.enCokBayt) => {
  const [yukleme, setYukleme] = useState<YuklemeDurumu>(null);
  const iptal = useRef<AbortController | null>(null);
  const yukle = async <Veri>(yol: string, dosya: Blob): Promise<PanelSonucu<Veri> | undefined> => {
    // Sürerken ikinci yükleme yok sayılır.
    if (iptal.current !== null) return undefined;
    if (dosya.size > enCokBayt) {
      return { tamam: false, kod: "dogrulama", ayrinti: [{ alan: "dosya", kod: "cok-buyuk" }] };
    }
    const denetim = new AbortController();
    iptal.current = denetim;
    setYukleme({ oran: 0 });
    try {
      return await panelYuklemesi<Veri>(yol, dosya, {
        ilerleme: (oran) => setYukleme({ oran }),
        sinyal: denetim.signal,
      });
    } finally {
      iptal.current = null;
      setYukleme(null);
    }
  };
  return { yukleme, yukle, iptalEt: () => iptal.current?.abort() };
};

const dosyaHatasiMi = (kod: string): kod is (typeof dosyaHatalari)[number] =>
  (dosyaHatalari as readonly string[]).includes(kod);

// Yükleme hatasının metni: dosyanın reddi (alanın kodu) ya da istek hatası. Metindeki {boyut} sınırın biçimli
// yazılışıyla doldurulur (sunucudan gelir). Belgenin (PDF, kart 0268) reddi kendi metinleriyle.
const belgeHatalari = ["bos", "cok-buyuk", "tur-izinsiz"] as const;
export const dosyaHatasiMetni = (
  hata: PanelHatasi,
  tur: "gorsel" | "belge" = "gorsel",
): MetinAnahtari => {
  const alanKodu = hata.ayrinti.find((ayrinti) => ayrinti.alan === "dosya")?.kod;
  if (tur === "belge" && (belgeHatalari as readonly string[]).includes(alanKodu ?? "")) {
    return `yonetim.dosya.belgeHatasi.${alanKodu as (typeof belgeHatalari)[number]}`;
  }
  if (alanKodu !== undefined && dosyaHatasiMi(alanKodu)) {
    return `yonetim.dosya.hata.${alanKodu}`;
  }
  if (hata.kod === "istek-siniri") return "yonetim.dosya.hata.istekSiniri";
  if (hata.kod === "ag") return "yonetim.dosya.hata.ag";
  if (hata.kod === "oturum-yok") return "yonetim.dosya.hata.oturum";
  if (hata.kod === "yetki") return "yonetim.dosya.hata.yetki";
  return "yonetim.dosya.hata.genel";
};
