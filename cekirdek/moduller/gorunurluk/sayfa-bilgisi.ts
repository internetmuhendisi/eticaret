// Vitrin sayfalarının başlığı ve açıklaması (kart 0135, karar 0103). Tarayıcı sekmesindeki başlık ve arama
// motorlarının göreceği açıklama yalnız buradan üretilir (.claude/rules/vitrin.md).
//
// - Vitrin çerçevesi kalıbı bir kez kurar: "<sayfa> | <mağaza adı>". Kalıp metin dosyasındadır, mağaza adı
//   mağaza sahibinin ayarıdır. Sayfa yalnız kendi adını verir; adı vermeyen sayfa (ana sayfa) mağaza adını alır.
// - Kaydın sayfası (kategori, marka, etiket, ürün) açıklamasını kaydın açıklamasından alır, yoksa türün
//   kalıbından üretir. Kayda özel başlık ve açıklama alanı panelle gelir (Görünürlük); o gün buraya eklenir.
import type { Metadata } from "next";
import type { AdresliKayitTuru } from "../../kayitlar/adres.ts";
import { metin } from "../../metinler/site-metni.ts";
import { doldur } from "../eposta/sablon.ts";
import { magazaninAdi } from "../magaza-ayarlari/servis.ts";
import type { AdresliKayit } from "./adres.ts";

// Arama motorlarının sonuç sayfasında gösterdiği açıklama yaklaşık bu uzunluktadır; uzun metin sözcük sonunda
// kesilir.
export const aciklamaUzunlugu = 160;

export const aciklamaKisalt = (metni: string): string => {
  const duz = metni.replace(/\s+/g, " ").trim();
  if (duz.length <= aciklamaUzunlugu) return duz;
  const kesik = duz.slice(0, aciklamaUzunlugu - 1);
  const bosluk = kesik.lastIndexOf(" ");
  return `${(bosluk > aciklamaUzunlugu / 2 ? kesik.slice(0, bosluk) : kesik).replace(/[\s,.;:]+$/, "")}…`;
};

// Vitrin çerçevesinin (app/(vitrin)/layout.tsx) başlık kalıbı ve varsayılan açıklaması.
export const vitrinSayfaKalibi = async (): Promise<Metadata> => {
  const magaza = await magazaninAdi();
  return {
    title: {
      template: doldur(metin("vitrin.sayfaBilgisi.kalip"), { baslik: "%s", magaza }),
      default: magaza,
    },
    description: doldur(metin("vitrin.sayfaBilgisi.aciklama.varsayilan"), { magaza }),
  };
};

// Kategori, marka, etiket ve ürün sayfasının başlığı ve açıklaması.
export const kayitSayfaBilgisi = async (
  tur: AdresliKayitTuru,
  kayit: Pick<AdresliKayit, "ad" | "aciklama">,
): Promise<Metadata> => {
  const kendi = kayit.aciklama?.trim();
  return {
    title: kayit.ad,
    description: aciklamaKisalt(
      kendi === undefined || kendi === ""
        ? doldur(metin(`vitrin.sayfaBilgisi.aciklama.${tur}`), {
            ad: kayit.ad,
            magaza: await magazaninAdi(),
          })
        : kendi,
    ),
  };
};
