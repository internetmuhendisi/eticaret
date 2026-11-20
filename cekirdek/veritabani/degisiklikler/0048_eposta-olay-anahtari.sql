-- Geri dönüş: geri alınabilir. İki yeni alan ve tekil indeks eski kodda okunmaz; geri dönmek için indeks ve alanlar kaldırılır. Kuyrukta bekleyen sipariş e-postalarını eski kod tanımaz, başarısız olurlar.
-- Kart 0240: müşteriye giden sipariş e-postaları (karar 0153); olay anahtarı aynı olayın ikinci e-postasını önler.
ALTER TABLE "eposta_kayitlari" ADD COLUMN "veri" jsonb;--> statement-breakpoint
ALTER TABLE "eposta_kayitlari" ADD COLUMN "olay_anahtari" text;--> statement-breakpoint
CREATE UNIQUE INDEX "eposta_kayitlari_olay" ON "eposta_kayitlari" USING btree ("olay_anahtari");