// Ekibe davetin şemaları (kart 0275, karar 0179): panelin davet penceresi, davet kabul sayfası ve uçları aynı şemayı
// kullanır.
import { z } from "zod";
import { davetAyari } from "../../kayitlar/oturum.ts";
import { kimlikSemasi } from "../../veritabani/kimlik.ts";
import { epostaSemasi, sifreSemasi } from "../oturum/semalar.ts";

// Rol kodları; servis kayıtta olup olmadığını ve tam yetkili olmadığını denetler.
export const davetRolleriSemasi = z.array(z.string().max(100)).min(1).max(20);

export const davetGonderSemasi = z.strictObject({
  eposta: epostaSemasi,
  roller: davetRolleriSemasi,
});

export const davetKimlikSemasi = z.strictObject({ kimlik: kimlikSemasi });

// Bağlantının anahtarı (adresin # sonrası): şifre sıfırlamanınkiyle aynı biçim.
export const davetAnahtariSemasi = z.string().min(1).max(128);
export const davetOkuSemasi = z.strictObject({ anahtar: davetAnahtariSemasi });

// Yöneticinin adı: ekipte görünür. Denetim karakteri (satır sonu dahil) taşımaz.
export const yoneticiAdiSemasi = z
  .string()
  .trim()
  .min(1)
  .max(davetAyari.adEnUzun)
  .regex(/^[^\p{Cc}]+$/u);

export const davetKabulSemasi = z.strictObject({
  anahtar: davetAnahtariSemasi,
  ad: yoneticiAdiSemasi,
  sifre: sifreSemasi,
});
