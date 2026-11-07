-- Geri dönüş: geri alınabilir. Eski kod bu alanı kullanmaz, alan ve indeks yerinde kalır; silinmez.
ALTER TABLE "vergi_siniflari" ADD COLUMN "kargo_sinifi" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "vergi_siniflari_kargo" ON "vergi_siniflari" USING btree ("kargo_sinifi") WHERE "vergi_siniflari"."kargo_sinifi";