// Deneme bölümleri (kart 0106): bölüm kütüphanesini kanıtlar. Mağazanın kütüphanesine girmez; yalnız
// bileşen kataloğunda ve testlerde kullanılır.
// - deneme-bolumu: her alan türünden bir alan, iki görünüm, yalnız ana sayfaya konur.
// - deneme-seridi: üst ve alt kısma konan, tek alanlı küçük bölüm.
// - deneme-yorumlari: yorum işlevine bağlı; işlev yokken vitrinde çizilmez.
import type { BolumKutuphanesi } from "../../vitrin/bolum-kutuphanesi/duzen.ts";
import type { BolumTarifi } from "../../vitrin/bolum-kutuphanesi/tarif.ts";

export const denemeBolumu = {
  tur: "deneme-bolumu",
  ad: "gelistirme.bolum.ad",
  duzenAlanlari: ["ana-sayfa"],
  alanlar: {
    baslik: { tur: "metin", ad: "gelistirme.bolum.alan.baslik", zorunlu: true, enCok: 80 },
    aciklama: { tur: "uzun-metin", ad: "gelistirme.bolum.alan.aciklama", enCok: 500 },
    gorsel: { tur: "gorsel", ad: "gelistirme.bolum.alan.gorsel" },
    baglanti: { tur: "baglanti", ad: "gelistirme.bolum.alan.baglanti" },
    urunler: { tur: "urun-kaynagi", ad: "gelistirme.bolum.alan.urunler", enCokUrun: 8 },
    kategori: { tur: "kategori", ad: "gelistirme.bolum.alan.kategori" },
    marka: { tur: "marka", ad: "gelistirme.bolum.alan.marka" },
    bitis: { tur: "tarih", ad: "gelistirme.bolum.alan.bitis", saatli: true },
    zemin: {
      tur: "renk",
      ad: "gelistirme.bolum.alan.zemin",
      renkler: ["kutu-1", "kutu-2", "kutu-3"],
    },
    // Kart 0110: sabit seçeneklerden biri, varsayılanıyla.
    sure: {
      tur: "secim",
      ad: "gelistirme.bolum.alan.sure",
      secenekler: [
        { kod: "kisa", ad: "gelistirme.bolum.alan.sureKisa" },
        { kod: "uzun", ad: "gelistirme.bolum.alan.sureUzun" },
      ],
      varsayilan: "uzun",
    },
    maddeler: {
      tur: "liste",
      ad: "gelistirme.bolum.alan.maddeler",
      ogeAdi: "gelistirme.bolum.alan.madde",
      enAz: 0,
      enCok: 3,
      alanlar: {
        metin: { tur: "metin", ad: "gelistirme.bolum.alan.maddeMetni", zorunlu: true, enCok: 40 },
        baglanti: { tur: "baglanti", ad: "gelistirme.bolum.alan.baglanti" },
      },
    },
  },
  gorunumler: [
    { kod: "genis", ad: "gelistirme.bolum.gorunum.genis" },
    { kod: "dar", ad: "gelistirme.bolum.gorunum.dar" },
  ],
} as const satisfies BolumTarifi;

export const denemeSeridi = {
  tur: "deneme-seridi",
  ad: "gelistirme.bolum.seritAdi",
  duzenAlanlari: ["ust-kisim", "alt-kisim"],
  alanlar: {
    metin: { tur: "metin", ad: "gelistirme.bolum.alan.baslik", zorunlu: true, enCok: 60 },
  },
  gorunumler: [{ kod: "duz", ad: "gelistirme.bolum.gorunum.duz" }],
} as const satisfies BolumTarifi;

export const denemeYorumlari = {
  tur: "deneme-yorumlari",
  ad: "gelistirme.bolum.yorumlarAdi",
  duzenAlanlari: ["ana-sayfa"],
  alanlar: { baslik: { tur: "metin", ad: "gelistirme.bolum.alan.baslik", enCok: 80 } },
  gorunumler: [{ kod: "duz", ad: "gelistirme.bolum.gorunum.duz" }],
  islev: "yorum",
} as const satisfies BolumTarifi;

export const denemeKutuphanesi: BolumKutuphanesi = {
  "deneme-bolumu": denemeBolumu,
  "deneme-seridi": denemeSeridi,
  "deneme-yorumlari": denemeYorumlari,
};
