// Ödeme işaretleri (kart 0108): sitede açık ödeme yöntemlerinin işaretleri (kullanıcı kararı). Ödeme işlevine
// bağlıdır: ödeme modülü yazılana kadar vitrinde çizilmez, panel nedenini gösterir.
import type { BolumTarifi } from "../../bolum-kutuphanesi/tarif.ts";

export const odemeIsaretleri = {
  tur: "odeme-isaretleri",
  ad: "vitrin.bolum.odemeIsaretleri.ad",
  duzenAlanlari: ["alt-kisim"],
  alanlar: {},
  gorunumler: [
    { kod: "yazili", ad: "vitrin.bolum.gorunum.yazili" },
    { kod: "yalniz-isaret", ad: "vitrin.bolum.gorunum.yalnizIsaret" },
  ],
  islev: "odeme",
} as const satisfies BolumTarifi;
