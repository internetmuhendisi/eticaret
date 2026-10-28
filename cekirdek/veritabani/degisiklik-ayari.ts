// Uygulanan değişikliklerin kaydının tutulduğu tablo. Hem değişiklik aracı (drizzle.config.ts)
// hem uygulama (guncelle.ts) buradan okur. Bu dosya import.meta kullanmaz, çünkü araç
// ayarını eski modül biçiminde yükler.
export const uygulananDegisiklikTablosu = { tablo: "uygulanan_degisiklikler", sema: "public" };
