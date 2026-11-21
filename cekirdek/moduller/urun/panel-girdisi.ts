// Panelin ürün ekranından gelen girdi (kart 0263): ürün servisinin girdisiyle aynıdır, yalnız ağırlık ve sayı türündeki
// özellik değerleri mağaza sahibinin yazdığı metindir ("1,5"). Metni sitenin sayı biçimiyle sunucu okur (kargo
// ekranının kuralı, karar 0135): ağırlık sitenin ağırlık birimindedir (agirlikBirimi) ve grama çevrilir, özelliğin sayısı
// özelliğin ondalık sınırıyla okunur. Okunamayan alan kendi yolu ve koduyla döner; geri kalan doğrulama servisindir.
// Seçenekler bölümünde birleşimlerin ağırlığı da aynı kuralla okunur (panelVaryantiniCevir, kart 0264).

import { ozellikSinirlari } from "../../kayitlar/ozellik.ts";
import { type AgirlikBirimi, agirlikBirimleri, agirlikSiniriGram } from "../../kayitlar/urun.ts";
import type { Bicimleyici } from "../../metinler/bicimleyici.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { ozellikServisi } from "../ozellik/servis.ts";
import { dogrulamaHatasi, type Sorun } from "./dogrulama.ts";

export type PanelGirdisiAyarlari = { bicimleyici: Bicimleyici; agirlikBirimi: AgirlikBirimi };

// Gramı sitenin biriminde yazılacak metne çevirir (ekranın başlangıç değeri). Boşsa boş metin.
export const agirlikYazisi = (gram: number | undefined, ayarlar: PanelGirdisiAyarlari): string => {
  if (gram === undefined) return "";
  const birim = agirlikBirimleri[ayarlar.agirlikBirimi];
  // Birimin ondalığına yuvarlanır, sondaki sıfırlar yazılmaz ("0,35", "2").
  const sabit = (gram / birim.gram).toFixed(birim.ondalik);
  const yuvarlak = sabit.includes(".") ? sabit.replace(/0+$/, "").replace(/\.$/, "") : sabit;
  const ondalik = yuvarlak.split(".")[1]?.length ?? 0;
  return ayarlar.bicimleyici.sayi(Number(yuvarlak), ondalik);
};

// Ağırlık metnini grama çevirip girdiye agirlikGram olarak yazar; boş metin null'dur (değişiklikte boşaltır). Okunamayan
// ya da sınırı aşan yazı verilen alanın yoluyla sorunlara eklenir.
const agirligiCevir = (
  agirlik: unknown,
  alan: string,
  girdi: Record<string, unknown>,
  sorunlar: Sorun[],
  ayarlar: PanelGirdisiAyarlari,
) => {
  if (agirlik === undefined) return;
  if (agirlik === null || (typeof agirlik === "string" && agirlik.trim() === "")) {
    girdi["agirlikGram"] = null;
    return;
  }
  const birim = agirlikBirimleri[ayarlar.agirlikBirimi];
  const sayi =
    typeof agirlik === "string" ? ayarlar.bicimleyici.sayiOku(agirlik, birim.ondalik) : undefined;
  const gram = sayi === undefined ? undefined : Math.round(sayi * birim.gram);
  if (gram === undefined) sorunlar.push({ alan, kod: "agirlik-bicimi" });
  else if (gram > agirlikSiniriGram) sorunlar.push({ alan, kod: "agirlik-siniri" });
  else girdi["agirlikGram"] = gram;
};

// Seçenekler bölümünün girdisi (kart 0264): her birleşimin ağırlığı ürünün ağırlığı gibi sitenin biriminde yazılı metindir.
// Hata birleşimin yeriyle döner ("birlesimler.2.agirlik"); geri kalan doğrulama servisindir (varyantKaydi).
export const panelVaryantiniCevir = (
  ham: Readonly<Record<string, unknown>>,
  ayarlar: PanelGirdisiAyarlari,
): Record<string, unknown> => {
  const { birlesimler, ...kalan } = ham;
  if (!Array.isArray(birlesimler)) return { ...ham };
  const sorunlar: Sorun[] = [];
  const cevrilen = birlesimler.map((birlesim: unknown, sira) => {
    if (typeof birlesim !== "object" || birlesim === null) return birlesim;
    const { agirlik, ...alanlar } = birlesim as Record<string, unknown>;
    const yeni: Record<string, unknown> = { ...alanlar };
    agirligiCevir(agirlik, `birlesimler.${sira}.agirlik`, yeni, sorunlar, ayarlar);
    return yeni;
  });
  if (sorunlar.length > 0) throw dogrulamaHatasi(sorunlar);
  return { ...kalan, birlesimler: cevrilen };
};

export const panelGirdisiniCevir = async (
  vt: Veritabani,
  ham: Readonly<Record<string, unknown>>,
  ayarlar: PanelGirdisiAyarlari,
): Promise<Record<string, unknown>> => {
  const { agirlik, ...kalan } = ham;
  const girdi: Record<string, unknown> = { ...kalan };
  const sorunlar: Sorun[] = [];
  agirligiCevir(agirlik, "agirlik", girdi, sorunlar, ayarlar);
  const degerler = girdi["ozellikler"];
  if (Array.isArray(degerler) && degerler.some((d) => typeof d?.deger === "string")) {
    const sayiOzellikleri = new Set(
      (await ozellikServisi.hepsiniOku(vt))
        .filter((ozellik) => ozellik.tur === "sayi")
        .map((ozellik) => ozellik.kimlik),
    );
    girdi["ozellikler"] = degerler.map((d: unknown, sira) => {
      if (typeof d !== "object" || d === null) return d;
      const { ozellik, deger } = d as { ozellik?: unknown; deger?: unknown };
      if (typeof deger !== "string" || typeof ozellik !== "string") return d;
      if (!sayiOzellikleri.has(ozellik.toLowerCase())) return d;
      const sayi = ayarlar.bicimleyici.sayiOku(deger, ozellikSinirlari.ondalik, true);
      if (sayi === undefined) {
        sorunlar.push({ alan: `ozellikler.${sira}.deger`, kod: "ozellik-deger-gecersiz" });
        return d;
      }
      return { ozellik, deger: sayi };
    });
  }
  if (sorunlar.length > 0) throw dogrulamaHatasi(sorunlar);
  return girdi;
};
