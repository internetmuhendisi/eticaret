// Sabit sayfa girdisinin şemaları (kart 0273). Panelin ekranı, uçlar ve sitenin başlangıç dosyası aynı alanları
// kullanır. Hata iletileri koddur (sabitSayfaHatalari); metni ekran çözer.
import { z } from "zod";
import { sabitSayfaDurumlari, sabitSayfaSinirlari } from "../../kayitlar/sayfa.ts";
import { adresAdiKalibi, adresAdiUzunlugu } from "../../metinler/adres-adi.ts";
import { kimlikSemasi } from "../../veritabani/kimlik.ts";
import { kayitMetni } from "../degisiklik-kaydi/deger.ts";

export const sabitSayfaHatalari = [
  "kayda-uygun-degil",
  "adres-adi-bicimi",
  // Silinmemiş başka bir sayfa bu adres adını kullanıyor.
  "adres-adi-tekrar",
  // Ekranın gördüğü sayfa arada değişti: hiçbir şey yazılmaz.
  "sayfa-degisti",
  "sayfa-siniri",
] as const;
export type SabitSayfaHatasi = (typeof sabitSayfaHatalari)[number];

// Kodların panel metinleri (ekran çözer).
export const sabitSayfaHataMetinleri = Object.fromEntries(
  sabitSayfaHatalari.map((kod) => [kod, `yonetim.sabitSayfa.hata.${kod}`]),
) as Record<SabitSayfaHatasi, `yonetim.sabitSayfa.hata.${SabitSayfaHatasi}`>;
const hata = (kod: SabitSayfaHatasi) => kod;

const adresAdi = z
  .string()
  .trim()
  .max(adresAdiUzunlugu)
  .regex(adresAdiKalibi, hata("adres-adi-bicimi"));

const alanlar = {
  baslik: kayitMetni(sabitSayfaSinirlari.baslik),
  adresAdi,
  // Biçimli metin (HTML). Kayda girmez; vitrin yazarken temizler (aciklamayiTemizle). Boş olabilir.
  icerik: z.string().max(sabitSayfaSinirlari.icerik),
  // Arama motoru açıklaması; düz metin.
  aciklama: kayitMetni(sabitSayfaSinirlari.aciklama),
  durum: z.enum(sabitSayfaDurumlari),
};

// Yeni sayfa. Verilmeyen adres adı başlıktan üretilir; durum verilmezse taslaktır.
export const sabitSayfaGirdisi = z.strictObject({
  baslik: alanlar.baslik,
  adresAdi: alanlar.adresAdi.optional(),
  icerik: alanlar.icerik.optional(),
  aciklama: alanlar.aciklama.optional(),
  durum: alanlar.durum.default("taslak"),
});
export type SabitSayfaGirdisi = z.input<typeof sabitSayfaGirdisi>;

// Değişiklik: yalnız verilen alan değişir, null açıklamayı boşaltır.
export const sabitSayfaDegisikligi = z.strictObject({
  baslik: alanlar.baslik.optional(),
  adresAdi: alanlar.adresAdi.optional(),
  icerik: alanlar.icerik.optional(),
  aciklama: alanlar.aciklama.nullable().optional(),
  durum: alanlar.durum.optional(),
});
export type SabitSayfaDegisikligi = z.input<typeof sabitSayfaDegisikligi>;

// Uçların zarfı: sayfanın alanları servisin şemasıyla doğrulanır (hata alanın adıyla ve kodla döner).
const nesne = z.record(z.string(), z.unknown());
export const sabitSayfaEklemeSemasi = z.strictObject({ sayfa: nesne });
// Ekranın gördüğü sayfanın son değişme anı (ISO): arada değişmişse sayfa-degisti.
export const sabitSayfaDegisikligiSemasi = z.strictObject({
  kimlik: kimlikSemasi,
  gorulen: z.iso.datetime({ offset: true }),
  sayfa: nesne,
});
export const sabitSayfaKimlikSemasi = z.strictObject({ kimlik: kimlikSemasi });
