// Kargo ücretinin tek hesabı (kart 0212, karar 0135). Sepet, ödeme, sipariş ve e-posta kargo ücretini yalnız buradan
// alır (.claude/rules/e-ticaret-is-kurallari.md: kargo ücreti, ücretsiz kargo sınırı ve bölge kuralları tek kargo
// hesabındadır). Saf işlevdir: veritabanına gitmez, tutarlar kuruştur.
//
// Kurallar (temel paket: Kargo; planlar/site-ayarlari.md):
// - Başlangıçta tek teslimat bölgesi vardır: sitenin teslimat yaptığı bütün ülkeler aynı ücreti öder.
// - Kargo gerektirmeyen ürünler (hediye paketi gibi) ücreti etkilemez; sepetin hepsi böyleyse kargo yoktur.
// - Ücret 0 ise kargo her zaman ücretsizdir.
// - Ücretsiz kargo sınırı varsa sepetin tutarı sınıra eşit ya da büyükse kargo ücretsizdir. Tutar bütün kalemlerin
//   (kargo gerektirmeyenler de) toplamıdır; ayara göre indirimden sonraki ya da önceki tutardır.
// - Ücret, sınır ve kalem tutarları fiyat girişi ayarına göredir (vergi dahil ya da hariç): aynı biçimde
//   karşılaştırılır. Kargonun vergisi vergi hesabında kargo sınıfından gelir (karar 0061).
import type { UcretsizKargoTutari } from "../../kayitlar/sepet.ts";

export type KargoAyarlari = {
  kargoUcreti: number;
  ucretsizKargoSiniri?: number | undefined;
  ucretsizKargoTutari: UcretsizKargoTutari;
};

export type KargoKalemi = {
  // Satırın tutarı (birim fiyat × adet), fiyat girişi biçiminde; indirimden sonra ve önce.
  tutar: number;
  indirimsizTutar: number;
  kargoGerekmez: boolean;
};

export type KargoSonucu =
  // Sepette kargo gerektiren ürün yok.
  | { tur: "yok" }
  | { tur: "ucretsiz" }
  // Sınıra kalan tutar yalnız sınır varken yazılır (ücretsiz kargo hedefi eklentisi kullanır).
  | { tur: "ucretli"; tutar: number; siniraKalan?: number };

export const kargoHesapla = (
  ayarlar: KargoAyarlari,
  kalemler: readonly KargoKalemi[],
): KargoSonucu => {
  if (!kalemler.some((kalem) => !kalem.kargoGerekmez)) return { tur: "yok" };
  if (ayarlar.kargoUcreti === 0) return { tur: "ucretsiz" };
  const sinir = ayarlar.ucretsizKargoSiniri;
  if (sinir === undefined) return { tur: "ucretli", tutar: ayarlar.kargoUcreti };
  const sepetTutari = kalemler.reduce(
    (toplam, kalem) =>
      toplam +
      (ayarlar.ucretsizKargoTutari === "indirimden-once" ? kalem.indirimsizTutar : kalem.tutar),
    0,
  );
  if (sepetTutari >= sinir) return { tur: "ucretsiz" };
  return { tur: "ucretli", tutar: ayarlar.kargoUcreti, siniraKalan: sinir - sepetTutari };
};
