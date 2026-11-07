-- Geri dönüş: geri alınabilir. Eski kod kategori tablolarını, döngü tetikleyicisini ve görevlinin kategori izinlerini kullanmaz; hepsi yerinde kalır, silinmez.
CREATE TABLE "kategoriler" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ad" text NOT NULL,
	"adres_adi" text NOT NULL,
	"aciklama" text,
	"ust_kimligi" uuid,
	"sira" integer DEFAULT 0 NOT NULL,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"guncellenme_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"silinme_zamani" timestamp with time zone,
	CONSTRAINT "kategoriler_kendi_ustu" CHECK ("kategoriler"."ust_kimligi" <> "kategoriler"."kimlik")
);
--> statement-breakpoint
CREATE TABLE "urun_kategorileri" (
	"urun_kimligi" uuid NOT NULL,
	"kategori_kimligi" uuid NOT NULL,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "urun_kategorileri_urun_kimligi_kategori_kimligi_pk" PRIMARY KEY("urun_kimligi","kategori_kimligi")
);
--> statement-breakpoint
ALTER TABLE "kategoriler" ADD CONSTRAINT "kategoriler_ust_kimligi_kategoriler_kimlik_fk" FOREIGN KEY ("ust_kimligi") REFERENCES "public"."kategoriler"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "urun_kategorileri" ADD CONSTRAINT "urun_kategorileri_urun_kimligi_urunler_kimlik_fk" FOREIGN KEY ("urun_kimligi") REFERENCES "public"."urunler"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "urun_kategorileri" ADD CONSTRAINT "urun_kategorileri_kategori_kimligi_kategoriler_kimlik_fk" FOREIGN KEY ("kategori_kimligi") REFERENCES "public"."kategoriler"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "kategoriler_adres_adi" ON "kategoriler" USING btree ("adres_adi") WHERE "kategoriler"."silinme_zamani" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "kategoriler_kardes_adi" ON "kategoriler" USING btree (coalesce("ust_kimligi", '00000000-0000-0000-0000-000000000000'::uuid),lower("ad")) WHERE "kategoriler"."silinme_zamani" is null;--> statement-breakpoint
CREATE INDEX "kategoriler_ust" ON "kategoriler" USING btree ("ust_kimligi");--> statement-breakpoint
CREATE INDEX "urun_kategorileri_kategori" ON "urun_kategorileri" USING btree ("kategori_kimligi");--> statement-breakpoint
-- Kategori kendi altına ya da bir torununun altına taşınamaz (kart 0077). Servis aynı kilitle denetler;
-- bu tetikleyici servisi atlayan yazılara karşı ikinci ağdır. Kilit, aynı anda yapılan iki taşımanın
-- birlikte döngü kurmasını önler. UNION, bozuk bir kayıtta bile aramanın bitmesini sağlar.
CREATE FUNCTION "kategori_dongu_denetle"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."ust_kimligi" IS NULL THEN
    RETURN NEW;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('kategori'));
  IF EXISTS (
    WITH RECURSIVE "atalar"("kimlik") AS (
      SELECT NEW."ust_kimligi"
      UNION
      SELECT "kategoriler"."ust_kimligi" FROM "kategoriler"
        JOIN "atalar" ON "kategoriler"."kimlik" = "atalar"."kimlik"
        WHERE "kategoriler"."ust_kimligi" IS NOT NULL
    )
    SELECT 1 FROM "atalar" WHERE "atalar"."kimlik" = NEW."kimlik"
  ) THEN
    RAISE EXCEPTION 'kategori kendi altina tasinamaz: %', NEW."kimlik" USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "kategoriler_dongu" BEFORE INSERT OR UPDATE OF "ust_kimligi" ON "kategoriler" FOR EACH ROW EXECUTE FUNCTION "kategori_dongu_denetle"();--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'kategori.gor' FROM "roller" WHERE "kod" = 'gorevli';--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'kategori.degistir' FROM "roller" WHERE "kod" = 'gorevli';
