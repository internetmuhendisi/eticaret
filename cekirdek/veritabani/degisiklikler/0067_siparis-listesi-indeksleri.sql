-- Geri dönüş: geri alınabilir. Yalnız iki indeks eklenir, eski kod onları kullanmasa da çalışır; indeksler silinebilir.
-- Kart 0298: panelin sipariş listesinin varsayılan sırası, tarih ve kargo firması süzgeci (ölçüm kartın notunda). Mağazaların sipariş sayısı küçük olduğu için indeks kurulurken kısa yazma kilidi önemsizdir.
CREATE INDEX "siparisler_zaman" ON "siparisler" USING btree ("olusturma_zamani","kimlik");--> statement-breakpoint
CREATE INDEX "siparisler_kargo_firmasi" ON "siparisler" USING btree ("kargo_firmasi") WHERE "siparisler"."kargo_firmasi" is not null;