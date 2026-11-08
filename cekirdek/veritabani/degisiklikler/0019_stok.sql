-- Geri dönüş: geri alınabilir. Eski kod stok tablolarını, ürünün stok takibi alanını, geçmişin değiştirilemezlik tetikleyicisini ve görevlinin stok izinlerini kullanmaz; hepsi yerinde kalır, silinmez.
CREATE TABLE "birim_stoklari" (
	"birim_kimligi" uuid PRIMARY KEY NOT NULL,
	"miktar" integer DEFAULT 0 NOT NULL,
	"guncellenme_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "birim_stoklari_miktar" CHECK ("birim_stoklari"."miktar" >= 0)
);
--> statement-breakpoint
CREATE TABLE "stok_gecmisi" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"birim_kimligi" uuid NOT NULL,
	"zaman" timestamp with time zone DEFAULT now() NOT NULL,
	"onceki_miktar" integer NOT NULL,
	"sonraki_miktar" integer NOT NULL,
	"sebep" text NOT NULL,
	"not" text,
	"kaynak_kimligi" uuid,
	"kim_turu" text NOT NULL,
	"kim_kimligi" uuid,
	"kim_adi" text,
	CONSTRAINT "stok_gecmisi_miktar" CHECK ("stok_gecmisi"."onceki_miktar" >= 0 and "stok_gecmisi"."sonraki_miktar" >= 0 and "stok_gecmisi"."onceki_miktar" <> "stok_gecmisi"."sonraki_miktar"),
	CONSTRAINT "stok_gecmisi_sebep" CHECK ("stok_gecmisi"."sebep" in ('sayim', 'yeni-mal', 'hasarli-kayip', 'iade-edilen', 'diger', 'siparis', 'siparis-iptali', 'siparis-iadesi')),
	CONSTRAINT "stok_gecmisi_kim_dolu" CHECK (("stok_gecmisi"."kim_turu" = 'sistem' and length("stok_gecmisi"."kim_adi") > 0 and "stok_gecmisi"."kim_kimligi" is null) or ("stok_gecmisi"."kim_turu" in ('yonetici', 'musteri', 'sahip') and "stok_gecmisi"."kim_kimligi" is not null and "stok_gecmisi"."kim_adi" is null))
);
--> statement-breakpoint
ALTER TABLE "urunler" ADD COLUMN "stok_takibi" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "birim_stoklari" ADD CONSTRAINT "birim_stoklari_birim_kimligi_urun_birimleri_kimlik_fk" FOREIGN KEY ("birim_kimligi") REFERENCES "public"."urun_birimleri"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stok_gecmisi" ADD CONSTRAINT "stok_gecmisi_birim_kimligi_urun_birimleri_kimlik_fk" FOREIGN KEY ("birim_kimligi") REFERENCES "public"."urun_birimleri"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stok_gecmisi_birim_zaman" ON "stok_gecmisi" USING btree ("birim_kimligi","zaman");--> statement-breakpoint
CREATE INDEX "stok_gecmisi_kaynak" ON "stok_gecmisi" USING btree ("kaynak_kimligi");--> statement-breakpoint
CREATE FUNCTION "stok_gecmisi_degistirilemez"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'stok gecmisi sonradan degistirilemez' USING ERRCODE = 'restrict_violation';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "stok_gecmisi_degistirilemez" BEFORE UPDATE OR DELETE OR TRUNCATE ON "stok_gecmisi" FOR EACH STATEMENT EXECUTE FUNCTION "stok_gecmisi_degistirilemez"();--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'stok.gor' FROM "roller" WHERE "kod" = 'gorevli';--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'stok.duzelt' FROM "roller" WHERE "kod" = 'gorevli';
