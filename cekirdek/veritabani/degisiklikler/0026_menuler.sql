-- Geri dönüş: geri alınabilir. Eski kod menü tablolarını ve ağaç tetikleyicisini kullanmaz; hepsi yerinde kalır, silinmez.
CREATE TABLE "menu_ogeleri" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"menu_kimligi" uuid NOT NULL,
	"ust_kimligi" uuid,
	"sira" integer DEFAULT 0 NOT NULL,
	"metin" text,
	"hedef_turu" text NOT NULL,
	"kategori_kimligi" uuid,
	"marka_kimligi" uuid,
	"urun_kimligi" uuid,
	"adres" text,
	"yeni_sekme" boolean DEFAULT false NOT NULL,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"guncellenme_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"silinme_zamani" timestamp with time zone,
	CONSTRAINT "menu_ogeleri_kendi_ustu" CHECK ("menu_ogeleri"."ust_kimligi" <> "menu_ogeleri"."kimlik"),
	CONSTRAINT "menu_ogeleri_sira" CHECK ("menu_ogeleri"."sira" >= 0),
	CONSTRAINT "menu_ogeleri_hedef" CHECK ("menu_ogeleri"."hedef_turu" in ('kategori', 'marka', 'urun', 'adres', 'baslik')
        and ("menu_ogeleri"."hedef_turu" = 'kategori') = ("menu_ogeleri"."kategori_kimligi" is not null)
        and ("menu_ogeleri"."hedef_turu" = 'marka') = ("menu_ogeleri"."marka_kimligi" is not null)
        and ("menu_ogeleri"."hedef_turu" = 'urun') = ("menu_ogeleri"."urun_kimligi" is not null)
        and ("menu_ogeleri"."hedef_turu" = 'adres') = ("menu_ogeleri"."adres" is not null)
        and ("menu_ogeleri"."hedef_turu" not in ('adres', 'baslik') or "menu_ogeleri"."metin" is not null)
        and ("menu_ogeleri"."hedef_turu" = 'adres' or not "menu_ogeleri"."yeni_sekme"))
);
--> statement-breakpoint
CREATE TABLE "menuler" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kod" text NOT NULL,
	"ad" text NOT NULL,
	"tur" text NOT NULL,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"guncellenme_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"silinme_zamani" timestamp with time zone,
	CONSTRAINT "menuler_tur" CHECK ("menuler"."tur" in ('elle', 'kategori-agaci'))
);
--> statement-breakpoint
ALTER TABLE "menu_ogeleri" ADD CONSTRAINT "menu_ogeleri_menu_kimligi_menuler_kimlik_fk" FOREIGN KEY ("menu_kimligi") REFERENCES "public"."menuler"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_ogeleri" ADD CONSTRAINT "menu_ogeleri_ust_kimligi_menu_ogeleri_kimlik_fk" FOREIGN KEY ("ust_kimligi") REFERENCES "public"."menu_ogeleri"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_ogeleri" ADD CONSTRAINT "menu_ogeleri_kategori_kimligi_kategoriler_kimlik_fk" FOREIGN KEY ("kategori_kimligi") REFERENCES "public"."kategoriler"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_ogeleri" ADD CONSTRAINT "menu_ogeleri_marka_kimligi_markalar_kimlik_fk" FOREIGN KEY ("marka_kimligi") REFERENCES "public"."markalar"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_ogeleri" ADD CONSTRAINT "menu_ogeleri_urun_kimligi_urunler_kimlik_fk" FOREIGN KEY ("urun_kimligi") REFERENCES "public"."urunler"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "menu_ogeleri_menu" ON "menu_ogeleri" USING btree ("menu_kimligi");--> statement-breakpoint
CREATE UNIQUE INDEX "menuler_kod" ON "menuler" USING btree ("kod") WHERE "menuler"."silinme_zamani" is null;--> statement-breakpoint
-- Menü öğesinin ağacı (kart 0107): menü silinmemiş ve elle kurulan olmalı, üst aynı menüde ve silinmemiş
-- olmalı, öğe kendi altına taşınamaz, derinlik 2'yi (cekirdek/kayitlar/menu.ts menuSinirlari.derinlik) aşamaz.
-- Servisle aynı kilidi alır: aynı anda yapılan iki taşıma sırayla denetlenir.
CREATE FUNCTION "menu_ogesi_agac_denetle"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  "ust_duzeyi" integer;
  "alt_derinligi" integer;
BEGIN
  IF NEW."silinme_zamani" IS NOT NULL THEN
    RETURN NEW;
  END IF;
  -- Kilitten sonra okunan ağaç yalnız READ COMMITTED işlemde kilitten sonraki durumu görür.
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'menu ogesi yalniz read committed islemde yazilir' USING ERRCODE = 'serialization_failure';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('menu'));
  IF NOT EXISTS (
    SELECT 1 FROM "menuler"
      WHERE "kimlik" = NEW."menu_kimligi" AND "silinme_zamani" IS NULL AND "tur" = 'elle'
  ) THEN
    RAISE EXCEPTION 'menu ogesi yalniz silinmemis, elle kurulan menude olur: %', NEW."kimlik" USING ERRCODE = 'check_violation';
  END IF;
  IF NEW."ust_kimligi" IS NULL THEN
    "ust_duzeyi" := 0;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM "menu_ogeleri"
        WHERE "kimlik" = NEW."ust_kimligi" AND "menu_kimligi" = NEW."menu_kimligi" AND "silinme_zamani" IS NULL
    ) THEN
      RAISE EXCEPTION 'menu ogesinin ustu ayni menude ve silinmemis olmali: %', NEW."kimlik" USING ERRCODE = 'check_violation';
    END IF;
    WITH RECURSIVE "atalar"("kimlik", "duzey") AS (
      SELECT NEW."ust_kimligi", 1
      UNION
      SELECT "menu_ogeleri"."ust_kimligi", "atalar"."duzey" + 1 FROM "menu_ogeleri"
        JOIN "atalar" ON "menu_ogeleri"."kimlik" = "atalar"."kimlik"
        WHERE "menu_ogeleri"."ust_kimligi" IS NOT NULL AND "atalar"."duzey" < 100
    )
    SELECT max("duzey") INTO "ust_duzeyi" FROM "atalar";
    IF EXISTS (
      WITH RECURSIVE "atalar"("kimlik") AS (
        SELECT NEW."ust_kimligi"
        UNION
        SELECT "menu_ogeleri"."ust_kimligi" FROM "menu_ogeleri"
          JOIN "atalar" ON "menu_ogeleri"."kimlik" = "atalar"."kimlik"
          WHERE "menu_ogeleri"."ust_kimligi" IS NOT NULL
      )
      SELECT 1 FROM "atalar" WHERE "atalar"."kimlik" = NEW."kimlik"
    ) THEN
      RAISE EXCEPTION 'menu ogesi kendi altina tasinamaz: %', NEW."kimlik" USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  WITH RECURSIVE "agac"("kimlik", "derinlik") AS (
    SELECT NEW."kimlik", 0
    UNION
    SELECT "menu_ogeleri"."kimlik", "agac"."derinlik" + 1 FROM "menu_ogeleri"
      JOIN "agac" ON "menu_ogeleri"."ust_kimligi" = "agac"."kimlik"
      WHERE "menu_ogeleri"."silinme_zamani" IS NULL AND "agac"."derinlik" < 100
  )
  SELECT max("derinlik") INTO "alt_derinligi" FROM "agac";
  IF "ust_duzeyi" + 1 + "alt_derinligi" > 2 THEN
    RAISE EXCEPTION 'menu derinligi asildi: %', NEW."kimlik" USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "menu_ogeleri_agac" BEFORE INSERT OR UPDATE OF "ust_kimligi", "menu_kimligi", "silinme_zamani" ON "menu_ogeleri" FOR EACH ROW EXECUTE FUNCTION "menu_ogesi_agac_denetle"();
