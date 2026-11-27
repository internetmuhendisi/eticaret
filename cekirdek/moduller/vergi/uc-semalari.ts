// Panelin vergi uçlarının girdileri (kart 0322). Sınıfın ve oranın alanları uçta nesne olarak alınır, servisin
// şemasıyla doğrulanır (semalar.ts): hata alanın adıyla ve koduyla döner. Bu dosya semalar.ts'ten ayrıdır:
// semalar.ts komutlarca Node ile doğrudan çalıştırılır (site doğrulaması), veritabanı kimliğini içe aktarmaz.
import { z } from "zod";
import { kimlikSemasi } from "../../veritabani/kimlik.ts";
import { fiyatGirisleri, vergiAdresleri, vergiYuvarlamalari } from "./semalar.ts";

const nesne = z.record(z.string(), z.unknown());

export const vergiSinifiEklemeSemasi = z.strictObject({ sinif: nesne });
export const vergiSinifiDegisikligiSemasi = z.strictObject({ kimlik: kimlikSemasi, sinif: nesne });
export const vergiKimlikSemasi = z.strictObject({ kimlik: kimlikSemasi });
export const vergiOraniEklemeSemasi = z.strictObject({ sinif: kimlikSemasi, oran: nesne });
export const vergiOraniDegisikligiSemasi = z.strictObject({ kimlik: kimlikSemasi, oran: nesne });
// Silinmemiş bütün sınıfların yeni sırası; eksik, fazla ya da tekrarlı liste servisde reddedilir.
export const vergiSinifSiralamaSemasi = z.strictObject({
  kimlikler: z.array(kimlikSemasi).min(1).max(50),
});

// Fiyatın yanındaki metin (fiyatEkMetni ayarı) üç hâldedir: yazılmazsa vergi adından kurulur ("otomatik"), boş metin
// hiçbir şey göstermez ("yok"), yazılan metin olduğu gibi görünür ("kendi").
export const fiyatEkMetniTurleri = ["otomatik", "yok", "kendi"] as const;
export type FiyatEkMetniTuru = (typeof fiyatEkMetniTurleri)[number];

// Vergi ekranının genel ayarları birlikte gider. Fiyat girişi burada değişmez (kart 0326); kargonun sınıfı null ise
// kargo vergisizdir.
export const vergiAyarlariSemasi = z.strictObject({
  vergiAcik: z.boolean(),
  // Adın kuralı (vergiAdiSemasi) serviste uygulanır: hata alanın adıyla ve vergi modülünün koduyla döner.
  vergiAdi: z.string().max(200),
  fiyatGosterimi: z.enum(fiyatGirisleri),
  fiyatEkMetniTuru: z.enum(fiyatEkMetniTurleri),
  // Yalnız "kendi" türünde okunur; ayarın kendi kuralıyla (uzunluk, kayda uygunluk) servis doğrular.
  fiyatEkMetni: z.string().max(200),
  vergiAdresi: z.enum(vergiAdresleri),
  vergiYuvarlama: z.enum(vergiYuvarlamalari),
  kargoSinifi: kimlikSemasi.nullable(),
});
export type VergiAyarlariGirdisi = z.output<typeof vergiAyarlariSemasi>;

// Fiyat girişinin değişikliği (kart 0326): önizleme ve CSV yalnız yeni girişi, uygulama önizlemenin sürümünü de alır.
export const fiyatGirisiOnizlemeSemasi = z.strictObject({ yeni: z.enum(fiyatGirisleri) });
export const fiyatGirisiDegisikligiSemasi = z.strictObject({
  yeni: z.enum(fiyatGirisleri),
  surum: z.string().regex(/^[0-9a-f]{32}$/),
});
