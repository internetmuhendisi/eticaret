// Menü satırı (kart 0108): ana menü ve kategori menüsü, açılır alt düzeyleriyle. Masaüstünde görünür; telefonda
// menüler logo satırının yan penceresinden açılır.
import type { BolumTarifi } from "../../bolum-kutuphanesi/tarif.ts";

export const menuSatiri = {
  tur: "menu-satiri",
  ad: "vitrin.bolum.menuSatiri.ad",
  duzenAlanlari: ["ust-kisim"],
  alanlar: {
    anaMenu: { tur: "menu", ad: "vitrin.bolum.menuSatiri.anaMenu", zorunlu: true },
    // Verilirse "Kategoriler" düğmesinin açılır listesi olur.
    kategoriMenusu: { tur: "menu", ad: "vitrin.bolum.menuSatiri.kategoriMenusu" },
  },
  gorunumler: [
    { kod: "sola-yasli", ad: "vitrin.bolum.gorunum.solaYasli" },
    { kod: "ortali", ad: "vitrin.bolum.gorunum.ortali" },
  ],
} as const satisfies BolumTarifi;
