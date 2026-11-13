// Düzen uçlarının ekranla ortak girdi şemaları (kart 0142, .claude/rules/sunucu-arayuzu.md). Bölümün değerleri
// burada yalnız nesne olarak alınır: türüne göre denetim bölüm tarifinden çıkar ve serviste yapılır
// (bolumuDenetle), kayıtlara başvuru veritabanında denetlenir.
import { z } from "zod";
import { type GorselBoyutu, gorselBoyutAdlari } from "../../kayitlar/gorsel.ts";
import { duzenAlanlari } from "../../kayitlar/tema.ts";
import { kimlikSemasi } from "../../veritabani/kimlik.ts";
import { alandakiEnCokBolum } from "../../vitrin/bolum-kutuphanesi/duzen.ts";

const alanSemasi = z.enum(duzenAlanlari);
const degerlerSemasi = z.record(z.string(), z.unknown());
// Bölüm türü ve görünümün kodu; kütüphanede olup olmadığına servis bakar.
const kodSemasi = z.string().min(1).max(64);

// Düzeni okuma: girdi yok.
export const duzenDurumuSemasi = z.strictObject({});

// Alana yeni bölüm. Sıra verilmezse alanın sonuna; 0 en üste (Slider kısayolu, karar 0101).
export const bolumEklemeSemasi = z.strictObject({
  alan: alanSemasi,
  tur: kodSemasi,
  gorunum: kodSemasi.optional(),
  gizli: z.boolean().optional(),
  degerler: degerlerSemasi,
  sira: z.number().int().min(0).max(alandakiEnCokBolum).optional(),
});
export type BolumEklemeGirdisi = z.input<typeof bolumEklemeSemasi>;

// Bölümün değerleri (bütün olarak) ve görünümü.
export const bolumDegisikligiSemasi = z.strictObject({
  kimlik: kimlikSemasi,
  gorunum: kodSemasi.optional(),
  degerler: degerlerSemasi.optional(),
});
export type BolumDegisikligiGirdisi = z.input<typeof bolumDegisikligiSemasi>;

export const bolumGorunurluguSemasi = z.strictObject({
  kimlik: kimlikSemasi,
  gizli: z.boolean(),
});

export const bolumSilmeSemasi = z.strictObject({ kimlik: kimlikSemasi });

// Bir alandaki bütün bölümlerin yeni sırası.
export const bolumSiralamaSemasi = z.strictObject({
  alan: alanSemasi,
  kimlikler: z.array(kimlikSemasi).max(alandakiEnCokBolum),
});

// Önceki hâline dönüş: her zaman bir önceki sürüme. son, ekranın gördüğü son sürümün sırasıdır; arada başka bir
// değişiklik yazıldıysa hiçbir şey yazılmaz (karar 0115).
export const duzenGeriDonusSemasi = z.strictObject({ son: z.number().int().positive() });

// Paneldeki görsel önizlemesi: görselin dosya kimliği ve kayıttaki boyutun adı.
export const panelGorseliSemasi = z.strictObject({
  d: kimlikSemasi,
  b: z.enum(gorselBoyutAdlari as [GorselBoyutu, ...GorselBoyutu[]]),
});
