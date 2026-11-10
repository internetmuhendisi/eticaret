// Düzendeki bir bölümün vitrinde neden çizilmediğinin paneldeki metni (kart 0112, karar 0081). Düzen servisi
// nedeni kodla verir (panelDuzeni, CizilmemeNedeni); metni burada seçilir. İşlevi olmayan bölümde metin işleve
// göredir: temel paketin henüz yazılmamış özelliği ile eklentiyle gelen özellik farklı söylenir (bülten
// eklentidir, kullanıcı kararı).
import type { Islev } from "../kayitlar/islevler.ts";
import type { MetinAnahtari } from "../metinler/metin.ts";
import type { CizilmemeNedeni } from "../moduller/duzen/servis.ts";

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
