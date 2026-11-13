// Stok kancaları (kart 0144, karar 0117): eklentilerin stok değişikliğine bağlandığı tek nokta. Stok servisi bir
// birimin stoğu sıfırdan (ya da altından) yukarı çıkınca, stoğu değiştiren işlemin içinde buradaki kancaları
// çağırır. Kanca site bilgisi almaz ve uzun iş yapmaz: işi kuyruğa koyar, eklentinin açık olup olmadığına iş
// çalışırken bakılır (eklentiAcikMi).
//
// Yeni eklenti kancasını bu listeye ekler; stok servisi değişmez.
import type { VeritabaniIslemi } from "../veritabani/baglanti.ts";
import { stokGelinceIsKoy } from "./stoga-gelince-haber-ver/isler.ts";

type StokGeldiKancasi = (islem: VeritabaniIslemi, birimler: readonly string[]) => Promise<void>;

const stokGeldiKancalari: readonly StokGeldiKancasi[] = [stokGelinceIsKoy];

export const stokGeldi = async (
  islem: VeritabaniIslemi,
  birimler: readonly string[],
): Promise<void> => {
  if (birimler.length === 0) return;
  for (const kanca of stokGeldiKancalari) await kanca(islem, birimler);
};
