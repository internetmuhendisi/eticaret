-- Geri dönüş: geri alınabilir. Eski kod alanı okumaz ve yazmaz; boş alan eski kodla çalışır. Silinmez.
-- Kart 0136: ürünün vitrin sırası (önerilen sıralama, tek genel sıra). Boşsa ürün sıralanmamıştır.
ALTER TABLE "urunler" ADD COLUMN "vitrin_sirasi" integer;--> statement-breakpoint
CREATE INDEX "urunler_vitrin_sirasi" ON "urunler" USING btree ("vitrin_sirasi") WHERE "urunler"."vitrin_sirasi" is not null;--> statement-breakpoint
ALTER TABLE "urunler" ADD CONSTRAINT "urunler_vitrin_sirasi" CHECK ("urunler"."vitrin_sirasi" is null or "urunler"."vitrin_sirasi" > 0);