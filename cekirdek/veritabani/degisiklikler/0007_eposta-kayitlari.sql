-- Geri dönüş: geri alınabilir. Eski kod bu tabloyu kullanmaz, tablo ve kayıtları yerinde kalır; silinmez.
CREATE TABLE "eposta_kayitlari" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alici" text NOT NULL,
	"sablon" text NOT NULL,
	"durum" text NOT NULL,
	"degiskenler" jsonb,
	"son_hata" text,
	"olusturulma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"gonderilme_zamani" timestamp with time zone,
	CONSTRAINT "eposta_kayitlari_durum" CHECK ("eposta_kayitlari"."durum" in ('bekliyor', 'gonderildi', 'gonderilmedi', 'basarisiz'))
);
--> statement-breakpoint
CREATE INDEX "eposta_kayitlari_alici" ON "eposta_kayitlari" USING btree ("alici");--> statement-breakpoint
CREATE INDEX "eposta_kayitlari_olusturulma" ON "eposta_kayitlari" USING btree ("olusturulma_zamani");