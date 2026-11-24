-- Geri dönüş: geri alınabilir. Yeni tablolar ve tetikleyici; eski kod tabloları bilmez, eski adres denetimine eklenen "blog-yazisi" türünü yazmaz. Geri dönüşte tablolar kalır, yazılar okunmaz.
-- Kart 0272 (karar 0176): blog yazıları ve blog kategorileri; yazının adres adı değişince ya da yazı silinince eski adres saklanır (eski_adresi_sakla, değişiklikler 0031 ve 0032).
CREATE TABLE "blog_kategorileri" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ad" text NOT NULL,
	"adres_adi" text NOT NULL,
	"sira" integer DEFAULT 0 NOT NULL,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"guncellenme_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"silinme_zamani" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "blog_yazilari" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"baslik" text NOT NULL,
	"adres_adi" text NOT NULL,
	"ozet" text,
	"icerik" text DEFAULT '' NOT NULL,
	"kapak_kimligi" uuid,
	"kapak_metni" text,
	"kategori_kimligi" uuid,
	"yazar" text,
	"durum" text NOT NULL,
	"yayin_zamani" timestamp with time zone,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"guncellenme_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"silinme_zamani" timestamp with time zone,
	CONSTRAINT "blog_yazilari_durum" CHECK ("blog_yazilari"."durum" in ('taslak', 'zamanlanmis', 'yayinda')),
	CONSTRAINT "blog_yazilari_yayin_zamani" CHECK ("blog_yazilari"."durum" = 'taslak' or "blog_yazilari"."yayin_zamani" is not null),
	CONSTRAINT "blog_yazilari_kapak" CHECK (("blog_yazilari"."kapak_kimligi" is null) = ("blog_yazilari"."kapak_metni" is null))
);
--> statement-breakpoint
ALTER TABLE "eski_adresler" DROP CONSTRAINT "eski_adresler_tur";--> statement-breakpoint
ALTER TABLE "blog_yazilari" ADD CONSTRAINT "blog_yazilari_kapak_kimligi_dosyalar_kimlik_fk" FOREIGN KEY ("kapak_kimligi") REFERENCES "public"."dosyalar"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_yazilari" ADD CONSTRAINT "blog_yazilari_kategori_kimligi_blog_kategorileri_kimlik_fk" FOREIGN KEY ("kategori_kimligi") REFERENCES "public"."blog_kategorileri"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "blog_kategorileri_adres_adi" ON "blog_kategorileri" USING btree ("adres_adi") WHERE "blog_kategorileri"."silinme_zamani" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "blog_kategorileri_ad" ON "blog_kategorileri" USING btree (lower(translate("ad", 'İIı', 'iii'))) WHERE "blog_kategorileri"."silinme_zamani" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "blog_yazilari_adres_adi" ON "blog_yazilari" USING btree ("adres_adi") WHERE "blog_yazilari"."silinme_zamani" is null;--> statement-breakpoint
CREATE INDEX "blog_yazilari_yayin" ON "blog_yazilari" USING btree ("durum","yayin_zamani");--> statement-breakpoint
CREATE INDEX "blog_yazilari_kategori" ON "blog_yazilari" USING btree ("kategori_kimligi");--> statement-breakpoint
CREATE INDEX "blog_yazilari_kapak" ON "blog_yazilari" USING btree ("kapak_kimligi");--> statement-breakpoint
ALTER TABLE "eski_adresler" ADD CONSTRAINT "eski_adresler_tur" CHECK ("eski_adresler"."kayit_turu" in ('kategori', 'marka', 'etiket', 'urun', 'blog-yazisi'));--> statement-breakpoint
CREATE TRIGGER "blog_yazilari_eski_adres" AFTER UPDATE OF "adres_adi", "silinme_zamani" ON "blog_yazilari" FOR EACH ROW EXECUTE FUNCTION "eski_adresi_sakla"('blog-yazisi');
