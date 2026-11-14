// Vitrin sayfalarının başlığı ve açıklaması (kart 0135, karar 0103). Tarayıcı sekmesindeki başlık ve arama
// motorlarının göreceği açıklama yalnız buradan üretilir (.claude/rules/vitrin.md).
//
// - Sayfanın sekme başlığı "<sayfa> | <mağaza adı>" kalıbındadır ve yalnız sayfaBasligi ile kurulur. Kalıp metin
//   dosyasındadır, mağaza adı mağaza sahibinin ayarıdır. Başlık tam olarak verilir (title.absolute): Next.js'in
//   kalıbı (%s) mağaza adındaki ya da kayıt adındaki işaretleri yorumlardı (bağımsız kontrol). Başlık vermeyen
//   sayfa (ana sayfa) vitrin çerçevesinin varsayılanını, mağaza adını alır.
// - Kaydın sayfası (kategori, marka, etiket, ürün) açıklamasını kaydın açıklamasından alır, yoksa türün
//   kalıbından üretir. Kayda özel başlık ve açıklama alanı panelle gelir (Görünürlük); o gün buraya eklenir.
import type { Metadata } from "next";
import { cache } from "react";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import type { AdresliKayitTuru } from "../../kayitlar/adres.ts";
import { metin } from "../../metinler/site-metni.ts";
import { doldur } from "../eposta/sablon.ts";
import { magazaninAdi } from "../magaza-ayarlari/servis.ts";
import type { AdresliKayit } from "./adres.ts";
import { sekmeBasligi } from "./sekme-basligi.ts";

// Mağaza adı istek başına bir kez okunur: çerçeve ve sayfa aynı adı kullanır.
const istekteMagazaAdi = cache(() => magazaninAdi());

// Arama motorlarının sonuç sayfasında gösterdiği açıklama yaklaşık bu uzunluktadır; uzun metin sözcük sonunda
// kesilir.
export const aciklamaUzunlugu = 160;

// Uzunluk harf (kod noktası) sayısıdır: emoji gibi iki birimlik harf ortadan bölünmez.
export const aciklamaKisalt = (metni: string): string => {
  const duz = metni.replace(/\s+/g, " ").trim();
  const harfler = Array.from(duz);
  if (harfler.length <= aciklamaUzunlugu) return duz;
  const kesik = harfler.slice(0, aciklamaUzunlugu - 1).join("");
  const bosluk = kesik.lastIndexOf(" ");
  return `${(bosluk > aciklamaUzunlugu / 2 ? kesik.slice(0, bosluk) : kesik).replace(/[\s,.;:]+$/, "")}…`;
};

// Vitrin çerçevesinin (app/(vitrin)/layout.tsx) varsayılan başlığı ve açıklaması.
export const vitrinSayfaKalibi = async (): Promise<Metadata> => {
  const magaza = await istekteMagazaAdi();
  return {
    title: magaza,
    description: doldur(metin("vitrin.sayfaBilgisi.aciklama.varsayilan"), { magaza }),
    // Tema demosu arama motorlarına kapalıdır (kart 0116): sayfanın kendi değeri de kapalı yöndedir, açan sayfa yoktur.
    ...(calisanSite().ayarlar.temaDemosu ? { robots: { index: false, follow: false } } : {}),
  };
};

// Bir vitrin sayfasının sekme başlığı: "<sayfa> | <mağaza adı>".
export const sayfaBasligi = async (baslik: string): Promise<Metadata["title"]> => ({
  absolute: sekmeBasligi(metin("vitrin.sayfaBilgisi.kalip"), baslik, await istekteMagazaAdi()),
});

// "Bulunamadı" sayfasının sekme başlığı (kart 0120, karar 0104): olmayan adres ve olmayan kayıt. Ekran okuyucu sayfa
// geçişini sekme başlığıyla duyurur; mağaza adı kalsaydı ana sayfadan ayırt edilemezdi.
export const bulunamadiSayfaBilgisi = async (): Promise<Metadata> => ({
  title: await sayfaBasligi(metin("vitrin.bulunamadi.sekmeBasligi")),
});

// Kategori, marka, etiket ve ürün sayfasının başlığı ve açıklaması.
export const kayitSayfaBilgisi = async (
  tur: AdresliKayitTuru,
  kayit: Pick<AdresliKayit, "ad" | "aciklama">,
): Promise<Metadata> => {
  const kendi = kayit.aciklama?.trim();
  return {
    title: await sayfaBasligi(kayit.ad),
    description: aciklamaKisalt(
      kendi === undefined || kendi === ""
        ? doldur(metin(`vitrin.sayfaBilgisi.aciklama.${tur}`), {
            ad: kayit.ad,
            magaza: await istekteMagazaAdi(),
          })
        : kendi,
    ),
  };
};
