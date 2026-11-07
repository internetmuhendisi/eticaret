-- Geri dönüş: geri alınabilir. Eski kod ürün tablolarını ve görevlinin ürün izinlerini kullanmaz; tablolar ve satırlar yerinde kalır, silinmez.
CREATE TABLE "urun_birimleri" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"urun_kimligi" uuid NOT NULL,
	"stok_kodu" text,
	"barkod" text,
	"agirlik_gram" integer,
	"en_mm" integer,
	"boy_mm" integer,
	"yukseklik_mm" integer,
	"sira" integer DEFAULT 0 NOT NULL,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"guncellenme_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"silinme_zamani" timestamp with time zone,
	CONSTRAINT "urun_birimleri_olcu" CHECK (coalesce("urun_birimleri"."agirlik_gram", 0) >= 0 and coalesce("urun_birimleri"."en_mm", 0) >= 0 and coalesce("urun_birimleri"."boy_mm", 0) >= 0 and coalesce("urun_birimleri"."yukseklik_mm", 0) >= 0)
);
--> statement-breakpoint
CREATE TABLE "urunler" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ad" text NOT NULL,
	"kisa_aciklama" text,
	"uzun_aciklama" text,
	"adres_adi" text NOT NULL,
	"durum" text DEFAULT 'taslak' NOT NULL,
	"yayin_zamani" timestamp with time zone,
	"kargo_gerekmez" boolean DEFAULT false NOT NULL,
	"en_az_adet" integer DEFAULT 1 NOT NULL,
	"en_cok_adet" integer,
	"vergi_sinifi_kimligi" uuid,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"guncellenme_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"silinme_zamani" timestamp with time zone,
	CONSTRAINT "urunler_durum" CHECK ("urunler"."durum" in ('taslak', 'yayinda', 'zamanlanmis', 'gizli', 'arsiv')),
	CONSTRAINT "urunler_yayin_zamani" CHECK (("urunler"."durum" = 'zamanlanmis') = ("urunler"."yayin_zamani" is not null)),
	CONSTRAINT "urunler_adet" CHECK ("urunler"."en_az_adet" >= 1 and ("urunler"."en_cok_adet" is null or "urunler"."en_cok_adet" >= "urunler"."en_az_adet"))
);
--> statement-breakpoint
ALTER TABLE "urun_birimleri" ADD CONSTRAINT "urun_birimleri_urun_kimligi_urunler_kimlik_fk" FOREIGN KEY ("urun_kimligi") REFERENCES "public"."urunler"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "urunler" ADD CONSTRAINT "urunler_vergi_sinifi_kimligi_vergi_siniflari_kimlik_fk" FOREIGN KEY ("vergi_sinifi_kimligi") REFERENCES "public"."vergi_siniflari"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "urun_birimleri_urun" ON "urun_birimleri" USING btree ("urun_kimligi");--> statement-breakpoint
CREATE UNIQUE INDEX "urun_birimleri_stok_kodu" ON "urun_birimleri" USING btree (lower("stok_kodu")) WHERE "urun_birimleri"."silinme_zamani" is null and "urun_birimleri"."stok_kodu" is not null;--> statement-breakpoint
CREATE INDEX "urun_birimleri_barkod" ON "urun_birimleri" USING btree ("barkod");--> statement-breakpoint
CREATE UNIQUE INDEX "urunler_adres_adi" ON "urunler" USING btree ("adres_adi") WHERE "urunler"."silinme_zamani" is null;--> statement-breakpoint
CREATE INDEX "urunler_vergi_sinifi" ON "urunler" USING btree ("vergi_sinifi_kimligi");--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'urun.gor' FROM "roller" WHERE "kod" = 'gorevli';--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'urun.degistir' FROM "roller" WHERE "kod" = 'gorevli';
