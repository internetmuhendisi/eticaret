// Panelin ürün ekranından gelen girdi (kart 0263): ürün servisinin girdisiyle aynıdır, yalnız ağırlık ve sayı türündeki
// özellik değerleri mağaza sahibinin yazdığı metindir ("1,5"). Metni sitenin sayı biçimiyle sunucu okur (kargo
// ekranının kuralı, karar 0135): ağırlık sitenin ağırlık birimindedir (agirlikBirimi) ve grama çevrilir, özelliğin sayısı
// özelliğin ondalık sınırıyla okunur. Okunamayan alan kendi yolu ve koduyla döner; geri kalan doğrulama servisindir.

import { ozellikSinirlari } from "../../kayitlar/ozellik.ts";
import { type AgirlikBirimi, agirlikBirimleri } from "../../kayitlar/urun.ts";
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

export const panelGirdisiniCevir = async (
  vt: Veritabani,
  ham: Readonly<Record<string, unknown>>,
  ayarlar: PanelGirdisiAyarlari,
): Promise<Record<string, unknown>> => {
  const { agirlik, ...kalan } = ham;
  const girdi: Record<string, unknown> = { ...kalan };
  const sorunlar: Sorun[] = [];
  if (agirlik !== undefined) {
    if (agirlik === null || (typeof agirlik === "string" && agirlik.trim() === "")) {
      girdi["agirlikGram"] = null;
    } else {
      const birim = agirlikBirimleri[ayarlar.agirlikBirimi];
      const sayi =
        typeof agirlik === "string"
          ? ayarlar.bicimleyici.sayiOku(agirlik, birim.ondalik)
          : undefined;
      if (sayi === undefined) sorunlar.push({ alan: "agirlik", kod: "agirlik-bicimi" });
      else girdi["agirlikGram"] = Math.round(sayi * birim.gram);
    }
  }
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
