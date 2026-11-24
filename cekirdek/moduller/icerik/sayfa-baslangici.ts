// Sitenin başlangıç sayfaları (baslangic/sayfalar.json, kart 0273): şeması ve kurulumu.
//
// - Site doğrulaması dosyayı şemayla ve alanlar arası kurallarla (adres adının tekilliği) okur. Başlangıç menüsü
//   sayfaya adres adıyla bağlanır; adres adı bu dosyada olmalıdır (site doğrulaması).
// - Ne zaman: arka plan süreci açılırken, menülerden önce (arka-plan-isleri/baslangic.ts): menü sayfaya bağlanacaksa
//   sayfa önceden yazılmış olmalı. Sitede hiç sayfa satırı (silinmiş bile olsa) yoksa yazılır. Sonra dosya kullanılmaz:
//   mağaza sahibinin sildiği sayfa geri gelmez.
// - Nasıl: servisle, tek işlemde; değişiklik kaydında yazan "baslangic-sayfa" adlı sistem işlemidir. İşlem içeriğin
//   kilidini alır: aynı anda açılan iki süreç sayfaları iki kez yazmaz.
//
// Site doğrulaması bu dosyayı Node ile doğrudan okur: yalnız .ts uzantısıyla, Node'un çalıştırdığı dosyaları alır.
import { z } from "zod";
import { sabitSayfaSinirlari } from "../../kayitlar/sayfa.ts";
import { sabitSayfaAlanlari } from "./sayfa-semalari.ts";

// Alanların kuralları servisinkilerdir (sabitSayfaAlanlari): doğrulamadan geçen dosya kurulumda da geçer (bağımsız
// kontrolün bulgusu: e-postaya benzeyen başlık doğrulamadan geçip kurulumda reddediliyordu).
export const sayfaBaslangicSemasi = z
  .array(
    z.strictObject({
      baslik: sabitSayfaAlanlari.baslik,
      adresAdi: sabitSayfaAlanlari.adresAdi,
      icerik: sabitSayfaAlanlari.icerik.default(""),
      aciklama: sabitSayfaAlanlari.aciklama.optional(),
      durum: sabitSayfaAlanlari.durum,
    }),
  )
  .max(sabitSayfaSinirlari.sayfaSayisi);
export type SayfaBaslangici = z.output<typeof sayfaBaslangicSemasi>;

// Alanlar arası kural: aynı adres adıyla iki sayfa olmaz.
export const sayfaBaslangicKurallari = (sayfalar: SayfaBaslangici): string[] => {
  const gorulen = new Set<string>();
  const sorunlar: string[] = [];
  for (const [sira, sayfa] of sayfalar.entries()) {
    if (gorulen.has(sayfa.adresAdi)) sorunlar.push(`${sira}.adresAdi: aynı adres adıyla iki sayfa`);
    gorulen.add(sayfa.adresAdi);
  }
  return sorunlar;
};
