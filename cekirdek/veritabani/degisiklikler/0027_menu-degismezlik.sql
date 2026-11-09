-- Geri dönüş: geri alınabilir. Eski kod öğeyi başka menüye taşımaz, menünün kodunu ve türünü değiştirmez; işlev ve tetikleyici yerinde kalır, silinmez.
-- Kart 0107'nin bağımsız kontrolü: tetikleyiciyi atlayan iki doğrudan yazı kapanır. Öğe başka menüye geçmez
-- (altları eski menüdeki üste bağlı kalırdı); menünün kodu ve türü değişmez (bölümler menüye koduyla başvurur,
-- öğesi olan menü kategori menüsüne dönemez). Ağaç denetiminin geri kalanı 0026'dakiyle aynıdır.
CREATE OR REPLACE FUNCTION "menu_ogesi_agac_denetle"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  "ust_duzeyi" integer;
  "alt_derinligi" integer;
BEGIN
  -- Öğe başka menüye geçmez: altları eski menüdeki üste bağlı kalırdı.
  IF TG_OP = 'UPDATE' AND NEW."menu_kimligi" <> OLD."menu_kimligi" THEN
    RAISE EXCEPTION 'menu ogesinin menusu degismez: %', NEW."kimlik" USING ERRCODE = 'check_violation';
  END IF;
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
CREATE FUNCTION "menu_kod_ve_tur_degismez"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."kod" <> OLD."kod" OR NEW."tur" <> OLD."tur" THEN
    RAISE EXCEPTION 'menunun kodu ve turu degismez: %', NEW."kimlik" USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "menuler_kod_ve_tur" BEFORE UPDATE OF "kod", "tur" ON "menuler" FOR EACH ROW EXECUTE FUNCTION "menu_kod_ve_tur_degismez"();
