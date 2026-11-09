// Güven şeridi (kart 0110, karar 0087): ikon ve kısa metinlerden oluşan sıra (ücretsiz kargo, kargoya verme
// süresi, iade, ödeme yolları). İkon ikon sözlüğünden seçilir. Metne ayardan dolan yer tutucu yazılabilir
// ("{kargoyaVermeSuresi} iş gününde kargoda", cekirdek/kayitlar/yer-tutucular.ts); değeri olmayan yer
// tutucuyu taşıyan madde çizilmez.
import type { IkonAdi } from "../../../../bilesenler/ikonlar/sozluk.ts";
import type { BolumTarifi } from "../../bolum-kutuphanesi/tarif.ts";

// Seçilebilen ikonlar: kod ikon sözlüğündeki addır (testler/ana-sayfa-bolumleri.test.tsx).
export const guvenIkonlari = [
  "kargo",
  "paket",
  "iade",
  "kart",
  "havale",
  "kapida-odeme",
  "guvenlik",
  "destek",
  "hediye",
] as const satisfies readonly IkonAdi[];

export const guvenSeridi = {
  tur: "guven-seridi",
  ad: "vitrin.bolum.guvenSeridi.ad",
  duzenAlanlari: ["ana-sayfa"],
  alanlar: {
    maddeler: {
      tur: "liste",
      ad: "vitrin.bolum.guvenSeridi.maddeler",
      ogeAdi: "vitrin.bolum.guvenSeridi.madde",
      enAz: 1,
      enCok: 6,
      alanlar: {
        ikon: {
          tur: "secim",
          ad: "vitrin.bolum.guvenSeridi.ikon",
          secenekler: [
            { kod: "kargo", ad: "vitrin.bolum.guvenSeridi.ikonlar.kargo" },
            { kod: "paket", ad: "vitrin.bolum.guvenSeridi.ikonlar.paket" },
            { kod: "iade", ad: "vitrin.bolum.guvenSeridi.ikonlar.iade" },
            { kod: "kart", ad: "vitrin.bolum.guvenSeridi.ikonlar.kart" },
            { kod: "havale", ad: "vitrin.bolum.guvenSeridi.ikonlar.havale" },
            { kod: "kapida-odeme", ad: "vitrin.bolum.guvenSeridi.ikonlar.kapidaOdeme" },
            { kod: "guvenlik", ad: "vitrin.bolum.guvenSeridi.ikonlar.guvenlik" },
            { kod: "destek", ad: "vitrin.bolum.guvenSeridi.ikonlar.destek" },
            { kod: "hediye", ad: "vitrin.bolum.guvenSeridi.ikonlar.hediye" },
          ],
          varsayilan: "kargo",
        },
        metin: {
          tur: "metin",
          ad: "vitrin.bolum.alan.metin",
          aciklama: "vitrin.bolum.guvenSeridi.yerTutucular",
          zorunlu: true,
          enCok: 60,
        },
      },
    },
  },
  // İkonlu satır: ikon yüzey renginde daire içinde, metin yanında, ortalı (Canlı Çarşı taslağı). Kutulu: her
  // madde kenarlı bir kutuda.
  gorunumler: [
    { kod: "ikonlu", ad: "vitrin.bolum.gorunum.ikonlu" },
    { kod: "kutulu", ad: "vitrin.bolum.gorunum.kutulu" },
  ],
} as const satisfies BolumTarifi;
