-- Geri dönüş: geri alınabilir. Eski kod ürünün düşük stok eşiği alanını kullanmaz; alan ve denetimi yerinde kalır, silinmez.
ALTER TABLE "urunler" ADD COLUMN "dusuk_stok_esigi" integer;--> statement-breakpoint
ALTER TABLE "urunler" ADD CONSTRAINT "urunler_dusuk_stok_esigi" CHECK ("urunler"."dusuk_stok_esigi" is null or "urunler"."dusuk_stok_esigi" >= 0);
