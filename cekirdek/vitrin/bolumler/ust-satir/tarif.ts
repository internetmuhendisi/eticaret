// Logo ve simgeler satırı (kart 0108): logo (yoksa mağaza adı), iletişim telefonu, hesap; arama, favori ve sepet
// ilgili işlev yazılınca görünür. Telefonda menü düğmesi seçilen menüleri yan pencerede açar (kullanıcı
// kararı); menü satırı telefonda gizlidir.
import type { BolumTarifi } from "../../bolum-kutuphanesi/tarif.ts";

export const ustSatir = {
  tur: "ust-satir",
  ad: "vitrin.bolum.ustSatir.ad",
  duzenAlanlari: ["ust-kisim"],
  alanlar: {
    // Telefonda yan pencerede açılan menüler, sırasıyla.
    menuler: {
      tur: "liste",
      ad: "vitrin.bolum.ustSatir.menuler",
      ogeAdi: "vitrin.bolum.ustSatir.menu",
      enAz: 0,
      enCok: 3,
      alanlar: { menu: { tur: "menu", ad: "vitrin.bolum.ustSatir.menu", zorunlu: true } },
    },
  },
  gorunumler: [
    { kod: "logo-solda", ad: "vitrin.bolum.gorunum.logoSolda" },
    { kod: "logo-ortada", ad: "vitrin.bolum.gorunum.logoOrtada" },
  ],
} as const satisfies BolumTarifi;
