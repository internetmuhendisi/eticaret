-- Geri dönüş: geri alınabilir. Eski kod bu tabloları kullanmaz, tablolar ve kayıtları yerinde kalır; silinmez.
CREATE TABLE "yonetici_sifre_sifirlamalari" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hesap_kimligi" uuid NOT NULL,
	"anahtar_ozeti" text NOT NULL,
	"bitis" timestamp with time zone NOT NULL,
	"kullanilma_zamani" timestamp with time zone,
	"olusturulma_zamani" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "musteri_sifre_sifirlamalari" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hesap_kimligi" uuid NOT NULL,
	"anahtar_ozeti" text NOT NULL,
	"bitis" timestamp with time zone NOT NULL,
	"kullanilma_zamani" timestamp with time zone,
	"olusturulma_zamani" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "yonetici_sifre_sifirlamalari" ADD CONSTRAINT "yonetici_sifre_sifirlamalari_hesap_kimligi_yoneticiler_kimlik_fk" FOREIGN KEY ("hesap_kimligi") REFERENCES "public"."yoneticiler"("kimlik") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "musteri_sifre_sifirlamalari" ADD CONSTRAINT "musteri_sifre_sifirlamalari_hesap_kimligi_musteriler_kimlik_fk" FOREIGN KEY ("hesap_kimligi") REFERENCES "public"."musteriler"("kimlik") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "yonetici_sifre_sifirlamalari_anahtar_benzersiz" ON "yonetici_sifre_sifirlamalari" USING btree ("anahtar_ozeti");--> statement-breakpoint
CREATE INDEX "yonetici_sifre_sifirlamalari_hesap" ON "yonetici_sifre_sifirlamalari" USING btree ("hesap_kimligi");--> statement-breakpoint
CREATE UNIQUE INDEX "musteri_sifre_sifirlamalari_anahtar_benzersiz" ON "musteri_sifre_sifirlamalari" USING btree ("anahtar_ozeti");--> statement-breakpoint
CREATE INDEX "musteri_sifre_sifirlamalari_hesap" ON "musteri_sifre_sifirlamalari" USING btree ("hesap_kimligi");