-- Geri dönüş: yedekten. Eski kod ikinci aşamayı bilmez: 0.7.0'dan eskiye dönmek korumayı sessizce kapatırdı.
CREATE TABLE "yonetici_giris_adimlari" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"yonetici_kimligi" uuid NOT NULL,
	"anahtar_ozeti" text NOT NULL,
	"bitis" timestamp with time zone NOT NULL,
	"bekleyen_gizli" text,
	"olusturulma_zamani" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yonetici_iki_asama" (
	"yonetici_kimligi" uuid PRIMARY KEY NOT NULL,
	"sifreli_gizli" text NOT NULL,
	"son_kod_adimi" bigint NOT NULL,
	"onay_zamani" timestamp with time zone NOT NULL,
	"guncellenme_zamani" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yonetici_yedek_kodlari" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"yonetici_kimligi" uuid NOT NULL,
	"kod_ozeti" text NOT NULL,
	"kullanilma_zamani" timestamp with time zone,
	"olusturulma_zamani" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "yonetici_oturumlari" ADD COLUMN "iki_asama_zamani" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "musteri_oturumlari" ADD COLUMN "iki_asama_zamani" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "yonetici_giris_adimlari" ADD CONSTRAINT "yonetici_giris_adimlari_yonetici_kimligi_yoneticiler_kimlik_fk" FOREIGN KEY ("yonetici_kimligi") REFERENCES "public"."yoneticiler"("kimlik") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yonetici_iki_asama" ADD CONSTRAINT "yonetici_iki_asama_yonetici_kimligi_yoneticiler_kimlik_fk" FOREIGN KEY ("yonetici_kimligi") REFERENCES "public"."yoneticiler"("kimlik") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yonetici_yedek_kodlari" ADD CONSTRAINT "yonetici_yedek_kodlari_yonetici_kimligi_yoneticiler_kimlik_fk" FOREIGN KEY ("yonetici_kimligi") REFERENCES "public"."yoneticiler"("kimlik") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "yonetici_giris_adimlari_benzersiz" ON "yonetici_giris_adimlari" USING btree ("anahtar_ozeti");--> statement-breakpoint
CREATE INDEX "yonetici_giris_adimlari_hesap" ON "yonetici_giris_adimlari" USING btree ("yonetici_kimligi");--> statement-breakpoint
CREATE UNIQUE INDEX "yonetici_yedek_kodlari_benzersiz" ON "yonetici_yedek_kodlari" USING btree ("yonetici_kimligi","kod_ozeti");