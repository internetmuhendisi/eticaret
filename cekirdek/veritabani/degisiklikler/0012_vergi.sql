-- Geri dönüş: geri alınabilir. Eski kod bu tabloları kullanmaz, tablolar ve satırları yerinde kalır; silinmez.
CREATE TABLE "vergi_oranlari" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sinif_kimligi" uuid NOT NULL,
	"ulke" text NOT NULL,
	"il" text,
	"posta_kodu" text,
	"oran_milyonda" integer NOT NULL,
	"ad" text,
	"sira" integer DEFAULT 0 NOT NULL,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"guncellenme_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"silinme_zamani" timestamp with time zone,
	CONSTRAINT "vergi_oranlari_oran_siniri" CHECK ("vergi_oranlari"."oran_milyonda" >= 0 and "vergi_oranlari"."oran_milyonda" <= 1000000)
);
--> statement-breakpoint
CREATE TABLE "vergi_siniflari" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ad" text NOT NULL,
	"sira" integer DEFAULT 0 NOT NULL,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"guncellenme_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"silinme_zamani" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "vergi_oranlari" ADD CONSTRAINT "vergi_oranlari_sinif_kimligi_vergi_siniflari_kimlik_fk" FOREIGN KEY ("sinif_kimligi") REFERENCES "public"."vergi_siniflari"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vergi_oranlari_sinif" ON "vergi_oranlari" USING btree ("sinif_kimligi");--> statement-breakpoint
CREATE UNIQUE INDEX "vergi_siniflari_ad" ON "vergi_siniflari" USING btree ("ad") WHERE "vergi_siniflari"."silinme_zamani" is null;