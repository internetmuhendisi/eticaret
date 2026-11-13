// Düzendeki bir bölümün vitrinde neden çizilmediğinin paneldeki metni (kart 0112, karar 0081). Düzen servisi
// nedeni kodla verir (panelDuzeni, CizilmemeNedeni); metni burada seçilir. İşlevi olmayan bölümde metin işleve
// göredir: temel paketin henüz yazılmamış özelliği ile eklentiyle gelen özellik farklı söylenir (bülten
// eklentidir, kullanıcı kararı).
import type { Islev } from "../kayitlar/islevler.ts";
import type { MetinAnahtari } from "../metinler/metin.ts";
import type { CizilmemeNedeni } from "../moduller/duzen/servis.ts";
import type { BosOlabilenBolum } from "../vitrin/bolum-kutuphanesi/gorunumler.tsx";

export const islevYokMetinleri = {
  yorum: "yonetim.duzen.neden.islevYok.yorum",
  blog: "yonetim.duzen.neden.islevYok.blog",
  bulten: "yonetim.duzen.neden.islevYok.bulten",
  arama: "yonetim.duzen.neden.islevYok.arama",
  favori: "yonetim.duzen.neden.islevYok.favori",
  sepet: "yonetim.duzen.neden.islevYok.sepet",
  odeme: "yonetim.duzen.neden.islevYok.odeme",
} as const satisfies Record<Islev, MetinAnahtari>;

export const cizilmemeNedeniMetni = (neden: CizilmemeNedeni): MetinAnahtari => {
  switch (neden.tur) {
    case "gizli":
      return "yonetim.duzen.neden.gizli";
    case "islev-yok":
      return islevYokMetinleri[neden.islev];
    case "tanimsiz":
      return "yonetim.duzen.neden.tanimsiz";
    case "gecersiz":
      return "yonetim.duzen.neden.gecersiz";
  }
};

// Vitrinde içeriği boş kaldığı için çizilmeyen bölümün metni (kart 0172): neden ve ne yapılacağı. Boşluk
// görünüşün kullandığı işlevle bulunur (bolumBosluklari); her tür kendi metnini taşır (tür kontrolü ister).
export const bosBolumMetinleri = {
  "menu-satiri": "yonetim.duzen.neden.bos.menu-satiri",
  "baglanti-sutunlari": "yonetim.duzen.neden.bos.baglanti-sutunlari",
  "iletisim-bilgileri": "yonetim.duzen.neden.bos.iletisim-bilgileri",
  "sosyal-hesaplar": "yonetim.duzen.neden.bos.sosyal-hesaplar",
  "odeme-isaretleri": "yonetim.duzen.neden.bos.odeme-isaretleri",
  "guven-seridi": "yonetim.duzen.neden.bos.guven-seridi",
  "kategori-kutulari": "yonetim.duzen.neden.bos.kategori-kutulari",
  "urun-vitrini": "yonetim.duzen.neden.bos.urun-vitrini",
  "sekmeli-vitrin": "yonetim.duzen.neden.bos.sekmeli-vitrin",
  firsatlar: "yonetim.duzen.neden.bos.firsatlar",
  "marka-logolari": "yonetim.duzen.neden.bos.marka-logolari",
  "musteri-yorumlari": "yonetim.duzen.neden.bos.musteri-yorumlari",
  "blog-yazilari": "yonetim.duzen.neden.bos.blog-yazilari",
  "bulten-kaydi": "yonetim.duzen.neden.bos.bulten-kaydi",
} as const satisfies Record<BosOlabilenBolum, MetinAnahtari>;
