-- Geri dönüş: geri alınabilir. Eski kod üç yeni alanı kullanmaz; yerinde kalır. Eski kodun temizliği ödemesi dışarıda başlamış oturumu 24 saatte siler (kayıt erken gider).
-- Kart 0215: ödemesi dışarıda başlamış oturumun korunması, erişim anahtarının bir kez verilmesi, taramanın sırası (bağımsız kontrolün bulguları, karar 0142).
DROP INDEX "kart_odemeleri_bekleyen";--> statement-breakpoint
ALTER TABLE "odeme_oturumlari" ADD COLUMN "odeme_disarida" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "kart_odemeleri" ADD COLUMN "erisim_verildi" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "kart_odemeleri" ADD COLUMN "son_sorgu_zamani" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "kart_odemeleri_bekleyen" ON "kart_odemeleri" USING btree ("son_sorgu_zamani","olusturma_zamani") WHERE "kart_odemeleri"."durum" = 'baslatildi';