-- Geri dönüş: geri alınabilir. Eski kod yeni alanı ve görevlilerin kupon izinlerini kullanmaz; hepsi yerinde kalır.
-- Kart 0313: panelin kupon ekranları (karar 0188). Kuponun değişme anı (çakışma denetimi); görevli ve sipariş görevlisi kuponları görür (kullanıcı kararı).
ALTER TABLE "kuponlar" ADD COLUMN "degisme_zamani" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'kupon.gor' FROM "roller" WHERE "kod" = 'gorevli';--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'kupon.gor' FROM "roller" WHERE "kod" = 'siparis-gorevlisi';
