-- Geri dönüş: geri alınabilir. Yeni tablo; geri almak için tablo kaldırılır (DROP TABLE "musteri_adresleri"), müşterilerin kayıtlı adresleri silinir.
-- Kart 0237: müşterinin adres defteri (karar 0149).
CREATE TABLE "musteri_adresleri" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"musteri_kimligi" uuid NOT NULL,
	"baslik" text NOT NULL,
	"ad" text NOT NULL,
	"soyad" text NOT NULL,
	"telefon" text,
	"ulke" text NOT NULL,
	"il" text,
	"ilce" text,
	"adres" text NOT NULL,
	"posta_kodu" text,
	"varsayilan_teslimat" boolean DEFAULT false NOT NULL,
	"varsayilan_fatura" boolean DEFAULT false NOT NULL,
	"olusturulma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"guncellenme_zamani" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "musteri_adresleri" ADD CONSTRAINT "musteri_adresleri_musteri_kimligi_musteriler_kimlik_fk" FOREIGN KEY ("musteri_kimligi") REFERENCES "public"."musteriler"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "musteri_adresleri_musteri" ON "musteri_adresleri" USING btree ("musteri_kimligi","olusturulma_zamani");--> statement-breakpoint
CREATE UNIQUE INDEX "musteri_adresleri_varsayilan_teslimat" ON "musteri_adresleri" USING btree ("musteri_kimligi") WHERE "musteri_adresleri"."varsayilan_teslimat";--> statement-breakpoint
CREATE UNIQUE INDEX "musteri_adresleri_varsayilan_fatura" ON "musteri_adresleri" USING btree ("musteri_kimligi") WHERE "musteri_adresleri"."varsayilan_fatura";