// Etiketleri okuyan ve değiştiren tek yol (kart 0078, karar 0064). İş kuralları marka ve etikette
// ortaktır (cekirdek/moduller/urun/grup-servisi.ts). Ürünün etiket bağlantısı ürün servisindedir.
import { grupServisi } from "../urun/grup-servisi.ts";
import { etiketler, urunEtiketleri } from "./model.ts";
import { etiketDegisikligi, etiketGirdisi } from "./semalar.ts";

export const etiketServisi = grupServisi({
  tablo: etiketler,
  baglanti: urunEtiketleri,
  kilit: "etiket",
  girdiSemasi: etiketGirdisi,
  degisiklikSemasi: etiketDegisikligi,
  kayitTuru: "etiket",
  islemler: { eklendi: "etiket.eklendi", degisti: "etiket.degisti", silindi: "etiket.silindi" },
});
