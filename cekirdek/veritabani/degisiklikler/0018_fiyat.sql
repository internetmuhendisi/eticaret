-- Geri dönüş: geri alınabilir. Eski kod fiyat tablolarını, geçmişin değiştirilemezlik tetikleyicisini ve görevlinin fiyat görme iznini kullanmaz; hepsi yerinde kalır, silinmez.
CREATE TABLE "birim_fiyatlari" (
	"birim_kimligi" uuid PRIMARY KEY NOT NULL,
	"satis_fiyati" bigint NOT NULL,
	"indirimli_fiyat" bigint,
	"indirim_baslangici" timestamp with time zone,
	"indirim_bitisi" timestamp with time zone,
	"para_birimi" text NOT NULL,
	"guncellenme_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "birim_fiyatlari_satis" CHECK ("birim_fiyatlari"."satis_fiyati" >= 0),
	CONSTRAINT "birim_fiyatlari_indirimli" CHECK ("birim_fiyatlari"."indirimli_fiyat" is null or ("birim_fiyatlari"."indirimli_fiyat" > 0 and "birim_fiyatlari"."indirimli_fiyat" < "birim_fiyatlari"."satis_fiyati")),
	CONSTRAINT "birim_fiyatlari_indirim_zamani" CHECK ("birim_fiyatlari"."indirimli_fiyat" is not null or ("birim_fiyatlari"."indirim_baslangici" is null and "birim_fiyatlari"."indirim_bitisi" is null)),
	CONSTRAINT "birim_fiyatlari_indirim_sirasi" CHECK ("birim_fiyatlari"."indirim_baslangici" is null or "birim_fiyatlari"."indirim_bitisi" is null or "birim_fiyatlari"."indirim_bitisi" > "birim_fiyatlari"."indirim_baslangici"),
	CONSTRAINT "birim_fiyatlari_para_birimi" CHECK ("birim_fiyatlari"."para_birimi" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "fiyat_gecmisi" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"birim_kimligi" uuid NOT NULL,
	"zaman" timestamp with time zone DEFAULT now() NOT NULL,
	"satis_fiyati" bigint NOT NULL,
	"indirimli_fiyat" bigint,
	"indirim_baslangici" timestamp with time zone,
	"indirim_bitisi" timestamp with time zone,
	"para_birimi" text NOT NULL,
	CONSTRAINT "fiyat_gecmisi_satis" CHECK ("fiyat_gecmisi"."satis_fiyati" >= 0),
	CONSTRAINT "fiyat_gecmisi_indirimli" CHECK ("fiyat_gecmisi"."indirimli_fiyat" is null or ("fiyat_gecmisi"."indirimli_fiyat" > 0 and "fiyat_gecmisi"."indirimli_fiyat" < "fiyat_gecmisi"."satis_fiyati")),
	CONSTRAINT "fiyat_gecmisi_indirim_zamani" CHECK ("fiyat_gecmisi"."indirimli_fiyat" is not null or ("fiyat_gecmisi"."indirim_baslangici" is null and "fiyat_gecmisi"."indirim_bitisi" is null)),
	CONSTRAINT "fiyat_gecmisi_indirim_sirasi" CHECK ("fiyat_gecmisi"."indirim_baslangici" is null or "fiyat_gecmisi"."indirim_bitisi" is null or "fiyat_gecmisi"."indirim_bitisi" > "fiyat_gecmisi"."indirim_baslangici"),
	CONSTRAINT "fiyat_gecmisi_para_birimi" CHECK ("fiyat_gecmisi"."para_birimi" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
ALTER TABLE "birim_fiyatlari" ADD CONSTRAINT "birim_fiyatlari_birim_kimligi_urun_birimleri_kimlik_fk" FOREIGN KEY ("birim_kimligi") REFERENCES "public"."urun_birimleri"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiyat_gecmisi" ADD CONSTRAINT "fiyat_gecmisi_birim_kimligi_urun_birimleri_kimlik_fk" FOREIGN KEY ("birim_kimligi") REFERENCES "public"."urun_birimleri"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fiyat_gecmisi_birim_zaman" ON "fiyat_gecmisi" USING btree ("birim_kimligi","zaman");--> statement-breakpoint
CREATE FUNCTION "fiyat_gecmisi_degistirilemez"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'fiyat gecmisi sonradan degistirilemez' USING ERRCODE = 'restrict_violation';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "fiyat_gecmisi_degistirilemez" BEFORE UPDATE OR DELETE OR TRUNCATE ON "fiyat_gecmisi" FOR EACH STATEMENT EXECUTE FUNCTION "fiyat_gecmisi_degistirilemez"();--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'fiyat.gor' FROM "roller" WHERE "kod" = 'gorevli';
