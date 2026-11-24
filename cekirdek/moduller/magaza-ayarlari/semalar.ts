// Mağaza ayarları uçlarının ekranla ortak girdi şemaları (kart 0094, .claude/rules/sunucu-arayuzu.md).
import { z } from "zod";
import { isletmeTurleri } from "../../kayitlar/satici.ts";
import { sosyalHesapSiniri, sosyalSiteler } from "../../kayitlar/sosyal-siteler.ts";
import { dosyaGovdesiSemasi } from "../dosya/semalar.ts";

// Logo yükleme: gövde dosyanın kendisidir (dosya yükleyen uçların ortak şeması, karar 0165).
export const logoYuklemeSemasi = dosyaGovdesiSemasi;

// Logoyu kaldırma: girdi yok.
export const logoKaldirmaSemasi = z.strictObject({});

// Mağaza bilgileri (kart 0278, karar 0175): panelin formu her alanı yazı olarak gönderir, boş yazı "yok" demektir.
// Alanların kuralları (telefon biçimi, il ve ilçe, vergi numarası, KEP, sosyal hesap kalıbı) ayar şemasındadır; servis
// (bilgiler.ts) onları uygular ve hatayı alanın yolu ve şemanın koduyla döndürür. Burada yalnız biçim ve üst sınır
// vardır: kapı şemanın kendi kodunu taşımaz (kart 0285).
const yazi = (enCok: number) => z.string().max(enCok);
export const magazaBilgileriSemasi = z.strictObject({
  magazaAdi: yazi(200),
  iletisimEpostasi: yazi(320),
  iletisimTelefonu: yazi(40),
  magazaAdresi: z.strictObject({
    ulke: yazi(10),
    il: yazi(20),
    ilce: yazi(20),
    adres: yazi(500),
    postaKodu: yazi(40),
  }),
  sosyalHesaplar: z
    .array(z.strictObject({ site: z.enum(sosyalSiteler), hesap: yazi(200) }))
    .max(sosyalSiteler.length * sosyalHesapSiniri),
  saticiBilgileri: z.strictObject({
    ulke: yazi(10),
    isletmeTuru: z.enum(isletmeTurleri),
    unvan: yazi(500),
    vergiDairesi: yazi(200),
    vergiNumarasi: yazi(60),
    mersisNumarasi: yazi(60),
    ticaretSicilNumarasi: yazi(100),
    kepAdresi: yazi(320),
  }),
});
export type MagazaBilgileriGirdisi = z.output<typeof magazaBilgileriSemasi>;
