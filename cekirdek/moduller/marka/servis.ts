// Markaları okuyan ve değiştiren tek yol (kart 0078, karar 0064). İş kuralları marka ve etikette
// ortaktır (cekirdek/moduller/urun/grup-servisi.ts). Ürünün marka bağlantısı ürün servisindedir.
import { grupServisi } from "../urun/grup-servisi.ts";
import { markalar, urunMarkalari } from "./model.ts";
import { markaDegisikligi, markaGirdisi } from "./semalar.ts";

export const markaServisi = grupServisi({
  tablo: markalar,
  baglanti: urunMarkalari,
  kilit: "marka",
  girdiSemasi: markaGirdisi,
  degisiklikSemasi: markaDegisikligi,
  kayitTuru: "marka",
  adresTuru: "marka",
  islemler: { eklendi: "marka.eklendi", degisti: "marka.degisti", silindi: "marka.silindi" },
});
