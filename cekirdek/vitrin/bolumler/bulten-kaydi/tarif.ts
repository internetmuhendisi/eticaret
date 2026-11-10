// Bülten kaydı (kart 0112, karar 0090): başlık, metin, e-posta alanı ve zorunlu pazarlama onayı. Bülten temel
// pakette değildir (kullanıcı kararı): bölüm bülten eklentisi kurulan sitede açılır, o güne kadar vitrinde
// çizilmez, panel nedenini gösterir. Yalnız ana sayfaya konur (kullanıcı kararı).
import type { BolumTarifi } from "../../bolum-kutuphanesi/tarif.ts";

export const bultenKaydi = {
  tur: "bulten-kaydi",
  ad: "vitrin.bolum.bultenKaydi.ad",
  duzenAlanlari: ["ana-sayfa"],
  islev: "bulten",
  alanlar: {
    baslik: { tur: "metin", ad: "vitrin.bolum.alan.baslik", zorunlu: true, enCok: 60 },
    metin: { tur: "uzun-metin", ad: "vitrin.bolum.alan.metin", enCok: 200 },
    zemin: {
      tur: "renk",
      ad: "vitrin.bolum.alan.zemin",
      renkler: [
        "birincil",
        "afis",
        "alt-kisim",
        "yuzey",
        "kutu-1",
        "kutu-2",
        "kutu-3",
        "kutu-4",
        "kutu-5",
      ],
    },
  },
  // Şerit: sayfanın bütün genişliğinde zemin renginde bir bant (Canlı Çarşı taslağı). Kutu: içerik genişliğinde
  // köşeli kutu. Form ikisinde de zemin renginde bir kutudadır: alanın, onay kutusunun ve hatanın okunurluğu
  // yalnız zemin üstünde ölçülmüştür.
  gorunumler: [
    { kod: "serit", ad: "vitrin.bolum.gorunum.serit" },
    { kod: "kutu", ad: "vitrin.bolum.gorunum.kutu" },
  ],
} as const satisfies BolumTarifi;
