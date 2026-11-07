// Bütün site ayarlarının şeması (.claude/rules/ayarlar.md, karar 0010).
// Her ayarın türü ve varsayılanı şemada, açıklaması ve kimin değiştirdiği ayar bilgisinde yazar.
// Değerler planlar/site-ayarlari.md dosyasındandır. İki şema vardır, her ayar sahibinin şemasında durur:
// - ayarSemasi: altyapı sahibinin ayarları. Sitenin ayarlar.json dosyasında yalnız varsayılandan
//   farklı olanlar yazılır, kayıt ve yayınla değişir.
// - magazaAyarSemasi: mağaza sahibinin ayarları. Sitenin veritabanında durur, panelden değişir. Site
//   klasöründe yalnız başlangıç değerleri olur (baslangic/ayarlar.json); ayar veritabanında ilk kez
//   yokken bir kez yazılır (cekirdek/moduller/magaza-ayarlari/, karar 0055).
import { z } from "zod";
import { type AyarSahibi, ayarSahibi } from "../kayitlar/site.ts";
import { saatDilimiGecerliMi } from "../metinler/bicimleyici.ts";
import { diller, type MetinAnahtari } from "../metinler/metin.ts";

export type AyarBilgisi = {
  aciklama: MetinAnahtari;
  kimDegistirir: AyarSahibi;
};

// Her ayarın açıklaması ve sahibi. Panelin ayar ekranları bu bilgiden üretilecek.
export const ayarBilgileri = z.registry<AyarBilgisi>();

const ayar = <T extends z.ZodType>(sema: T, bilgi: AyarBilgisi): T => {
  ayarBilgileri.add(sema, bilgi);
  return sema;
};

const altyapiSahibinin = (aciklama: MetinAnahtari): AyarBilgisi => ({
  aciklama,
  kimDegistirir: ayarSahibi.altyapi,
});

export const magazaSahibinin = (aciklama: MetinAnahtari): AyarBilgisi => ({
  aciklama,
  kimDegistirir: ayarSahibi.magaza,
});

export const ayarSemasi = z.strictObject({
  ulke: ayar(
    z
      .string()
      .regex(/^[A-Z]{2}$/, "İki büyük harfli ülke kodu olmalı, örneğin TR.")
      .default("TR"),
    altyapiSahibinin("ayar.aciklama.ulke"),
  ),
  dil: ayar(z.enum(diller).default("tr"), altyapiSahibinin("ayar.aciklama.dil")),
  paraBirimi: ayar(
    z
      .string()
      .regex(/^[A-Z]{3}$/, "Üç büyük harfli para birimi kodu olmalı, örneğin TRY.")
      .default("TRY"),
    altyapiSahibinin("ayar.aciklama.paraBirimi"),
  ),
  paraBicimi: ayar(
    z
      .strictObject({
        simge: z.string().min(1).default("₺"),
        simgeYeri: z.enum(["basta", "sonda"]).default("sonda"),
        simgeBoslugu: z.boolean().default(true),
        binlikAyirici: z.string().default("."),
        ondalikAyirici: z.string().min(1).default(","),
        ondalikSayisi: z.int().min(0).max(4).default(2),
      })
      .prefault({}),
    altyapiSahibinin("ayar.aciklama.paraBicimi"),
  ),
  saatDilimi: ayar(
    z
      .string()
      .refine(saatDilimiGecerliMi, "Tanınan bir saat dilimi olmalı, örneğin Europe/Istanbul.")
      .default("Europe/Istanbul"),
    altyapiSahibinin("ayar.aciklama.saatDilimi"),
  ),
  agirlikBirimi: ayar(
    z.enum(["kg", "g", "lb", "oz"]).default("kg"),
    altyapiSahibinin("ayar.aciklama.agirlikBirimi"),
  ),
  boyutBirimi: ayar(
    z.enum(["cm", "mm", "in"]).default("cm"),
    altyapiSahibinin("ayar.aciklama.boyutBirimi"),
  ),
  // Varsayılanı sitenin görünen adından türetilir (site-klasoru.ts), bu yüzden şemada boş kalabilir.
  siparisOneki: ayar(
    z
      .string()
      .regex(/^[A-Z]{2,5}$/, "2-5 büyük harf olmalı (yalnız İngiliz alfabesi), örneğin ORN.")
      .optional(),
    altyapiSahibinin("ayar.aciklama.siparisOneki"),
  ),
  siparisBaslangici: ayar(
    z.int().positive().default(1001),
    altyapiSahibinin("ayar.aciklama.siparisBaslangici"),
  ),
  temaDegistirilebilir: ayar(
    z.boolean().default(true),
    altyapiSahibinin("ayar.aciklama.temaDegistirilebilir"),
  ),
  vitrindeAltyapiAdi: ayar(
    z.boolean().default(false),
    altyapiSahibinin("ayar.aciklama.vitrindeAltyapiAdi"),
  ),
  // Ana sayfada başlığın altında "Yakında açılıyoruz." yazısı (kart 0041). Bakım modu değildir:
  // vitrin açık kalır. Mağaza sahibinin ayarları gelince panele taşınabilir.
  yakindaYazisi: ayar(z.boolean().default(false), altyapiSahibinin("ayar.aciklama.yakindaYazisi")),
  // Bakım sayfasının metni (kart 0043). Sayfayı ön kapı sunar; boşsa ortak metin görünür.
  bakimMetni: ayar(
    z.string().trim().min(1).max(300).optional(),
    altyapiSahibinin("ayar.aciklama.bakimMetni"),
  ),
  // E-postanın göndereni (kart 0032). Gönderen adresi olmayan site e-posta göndermez.
  epostaGonderenAdi: ayar(
    z.string().trim().min(1).max(100).optional(),
    altyapiSahibinin("ayar.aciklama.epostaGonderenAdi"),
  ),
  epostaGonderenAdresi: ayar(
    z.email().optional(),
    altyapiSahibinin("ayar.aciklama.epostaGonderenAdresi"),
  ),
  epostaYanitAdresi: ayar(
    z.email().optional(),
    altyapiSahibinin("ayar.aciklama.epostaYanitAdresi"),
  ),
  // Mağaza sahibinin marka ayarları gelince panele taşınır.
  logoAdresi: ayar(
    z.url({ protocol: /^https$/ }).optional(),
    altyapiSahibinin("ayar.aciklama.logoAdresi"),
  ),
  // Hiç girilmeyen oturumun kapanma süresi (kart 0025). Güvenlik ayarıdır, altyapı sahibinindir.
  yoneticiOturumuSaat: ayar(
    z.int().min(1).max(720).default(24),
    altyapiSahibinin("ayar.aciklama.yoneticiOturumuSaat"),
  ),
  musteriOturumuGun: ayar(
    z.int().min(1).max(365).default(30),
    altyapiSahibinin("ayar.aciklama.musteriOturumuGun"),
  ),
});

// Mağaza sahibinin ayarları. Her ayarın varsayılanı olur (ya da boş kalabilir); veritabanında JSON
// olarak saklandığı için değer null olamaz, boş değer "yok" demektir. İlk ayarlar kart 0071 ve vergi
// kartlarıyla gelir.
export const magazaAyarSemasi = z.strictObject({});
export type MagazaAyarlari = z.output<typeof magazaAyarSemasi>;

// Varsayılanları uygulanmış ve sipariş öneki türetilmiş ayarlar.
export type SiteAyarlari = Omit<z.output<typeof ayarSemasi>, "siparisOneki"> & {
  siparisOneki: string;
};

// Görünen addan sipariş öneki: ilk üç harf, büyük ve yalnız İngiliz alfabesiyle ("Örnek" → "ORN").
export const onekTuret = (gorunenAd: string): string =>
  gorunenAd
    .replaceAll("ı", "i")
    .replaceAll("İ", "I")
    .normalize("NFD")
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 3)
    .toUpperCase();
