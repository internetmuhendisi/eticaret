-- Geri dönüş: geri alınabilir. Yeni tablolardır, kullanılmaya başlamadan silinerek geri alınır; hesap açıldıktan sonra silmek hesapları ve oturumları da siler.
CREATE TABLE "yonetici_oturumlari" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hesap_kimligi" uuid NOT NULL,
	"kisa_anahtar_ozeti" text NOT NULL,
	"kisa_anahtar_bitis" timestamp with time zone NOT NULL,
	"yenileme_anahtari_ozeti" text NOT NULL,
	"onceki_yenileme_ozeti" text,
	"yenileme_zamani" timestamp with time zone,
	"oturum_bitis" timestamp with time zone NOT NULL,
	"kapanma_zamani" timestamp with time zone,
	"olusturulma_zamani" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yoneticiler" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"eposta" text NOT NULL,
	"sifre_ozeti" text NOT NULL,
	"olusturulma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"guncellenme_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"silinme_zamani" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "musteri_oturumlari" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hesap_kimligi" uuid NOT NULL,
	"kisa_anahtar_ozeti" text NOT NULL,
	"kisa_anahtar_bitis" timestamp with time zone NOT NULL,
	"yenileme_anahtari_ozeti" text NOT NULL,
	"onceki_yenileme_ozeti" text,
	"yenileme_zamani" timestamp with time zone,
	"oturum_bitis" timestamp with time zone NOT NULL,
	"kapanma_zamani" timestamp with time zone,
	"olusturulma_zamani" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "musteriler" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"eposta" text NOT NULL,
	"sifre_ozeti" text NOT NULL,
	"olusturulma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"guncellenme_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"silinme_zamani" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "yonetici_oturumlari" ADD CONSTRAINT "yonetici_oturumlari_hesap_kimligi_yoneticiler_kimlik_fk" FOREIGN KEY ("hesap_kimligi") REFERENCES "public"."yoneticiler"("kimlik") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "musteri_oturumlari" ADD CONSTRAINT "musteri_oturumlari_hesap_kimligi_musteriler_kimlik_fk" FOREIGN KEY ("hesap_kimligi") REFERENCES "public"."musteriler"("kimlik") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "yonetici_oturumlari_kisa_anahtar_benzersiz" ON "yonetici_oturumlari" USING btree ("kisa_anahtar_ozeti");--> statement-breakpoint
CREATE UNIQUE INDEX "yonetici_oturumlari_yenileme_anahtari_benzersiz" ON "yonetici_oturumlari" USING btree ("yenileme_anahtari_ozeti");--> statement-breakpoint
CREATE INDEX "yonetici_oturumlari_onceki_yenileme" ON "yonetici_oturumlari" USING btree ("onceki_yenileme_ozeti");--> statement-breakpoint
CREATE INDEX "yonetici_oturumlari_hesap" ON "yonetici_oturumlari" USING btree ("hesap_kimligi");--> statement-breakpoint
CREATE UNIQUE INDEX "yoneticiler_eposta_benzersiz" ON "yoneticiler" USING btree ("eposta") WHERE "yoneticiler"."silinme_zamani" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "musteri_oturumlari_kisa_anahtar_benzersiz" ON "musteri_oturumlari" USING btree ("kisa_anahtar_ozeti");--> statement-breakpoint
CREATE UNIQUE INDEX "musteri_oturumlari_yenileme_anahtari_benzersiz" ON "musteri_oturumlari" USING btree ("yenileme_anahtari_ozeti");--> statement-breakpoint
CREATE INDEX "musteri_oturumlari_onceki_yenileme" ON "musteri_oturumlari" USING btree ("onceki_yenileme_ozeti");--> statement-breakpoint
CREATE INDEX "musteri_oturumlari_hesap" ON "musteri_oturumlari" USING btree ("hesap_kimligi");--> statement-breakpoint
CREATE UNIQUE INDEX "musteriler_eposta_benzersiz" ON "musteriler" USING btree ("eposta") WHERE "musteriler"."silinme_zamani" is null;