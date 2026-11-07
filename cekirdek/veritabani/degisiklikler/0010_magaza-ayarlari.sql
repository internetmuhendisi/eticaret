-- Geri dönüş: geri alınabilir. Eski kod bu tabloyu kullanmaz, tablo ve satırları yerinde kalır; silinmez.
CREATE TABLE "magaza_ayarlari" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"anahtar" text NOT NULL,
	"deger" jsonb,
	"guncellenme_zamani" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "magaza_ayarlari_anahtar" ON "magaza_ayarlari" USING btree ("anahtar");