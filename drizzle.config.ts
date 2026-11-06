// Veritabanı değişiklik dosyalarını üreten aracın ayarı (karar 0022).
// Üretmek: pnpm veritabani-degisikligi-uret --name <kisa-ad>
// Üretilen dosyanın ilk satırına geri dönüş notu elle yazılır (cekirdek/veritabani/guncelle.ts).
import { defineConfig } from "drizzle-kit";
import { uygulananDegisiklikTablosu } from "./cekirdek/veritabani/degisiklik-ayari.ts";

export default defineConfig({
  dialect: "postgresql",
  schema: ["./cekirdek/veritabani/tablolar", "./cekirdek/moduller/*/model.ts"],
  // cekirdek/veritabani/guncelle.ts dosyasındaki degisiklikKlasoru ile aynıdır (testle denetlenir).
  out: "./cekirdek/veritabani/degisiklikler",
  migrations: {
    table: uygulananDegisiklikTablosu.tablo,
    schema: uygulananDegisiklikTablosu.sema,
  },
});
