-- Geri dönüş: geri alınabilir. Eski kod tabloyu yalnız 0031 işleviyle yazar; bu işlev ve tetikleyiciler yerinde kalırsa silinen kaydın adı da saklanır, eski kod bunu okumaz. Silinmez.
-- Kart 0135'in bağımsız kontrolü (karar 0103): kayıt silinince de adını bırakmış sayılır. Yoksa adı sonradan alıp silinen kaydın adresi, adın daha eski sahibine yönleniyordu (ölçüldü). Silme işaretlenince ad, silinen kaydın eski adı olarak saklanır; çözücü silinmiş kayda yönlendirmediği için adres "bulunamadı"ya düşer.
CREATE OR REPLACE FUNCTION "eski_adresi_sakla"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."adres_adi" IS DISTINCT FROM OLD."adres_adi"
    OR (OLD."silinme_zamani" IS NULL AND NEW."silinme_zamani" IS NOT NULL) THEN
    INSERT INTO "eski_adresler" ("kayit_turu", "kayit_kimligi", "adres_adi")
    VALUES (TG_ARGV[0], OLD."kimlik", OLD."adres_adi")
    ON CONFLICT ("kayit_turu", "adres_adi")
    DO UPDATE SET "kayit_kimligi" = EXCLUDED."kayit_kimligi", "olusturma_zamani" = now();
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint
DROP TRIGGER "kategoriler_eski_adres" ON "kategoriler";--> statement-breakpoint
DROP TRIGGER "markalar_eski_adres" ON "markalar";--> statement-breakpoint
DROP TRIGGER "etiketler_eski_adres" ON "etiketler";--> statement-breakpoint
DROP TRIGGER "urunler_eski_adres" ON "urunler";--> statement-breakpoint
CREATE TRIGGER "kategoriler_eski_adres" AFTER UPDATE OF "adres_adi", "silinme_zamani" ON "kategoriler" FOR EACH ROW EXECUTE FUNCTION "eski_adresi_sakla"('kategori');--> statement-breakpoint
CREATE TRIGGER "markalar_eski_adres" AFTER UPDATE OF "adres_adi", "silinme_zamani" ON "markalar" FOR EACH ROW EXECUTE FUNCTION "eski_adresi_sakla"('marka');--> statement-breakpoint
CREATE TRIGGER "etiketler_eski_adres" AFTER UPDATE OF "adres_adi", "silinme_zamani" ON "etiketler" FOR EACH ROW EXECUTE FUNCTION "eski_adresi_sakla"('etiket');--> statement-breakpoint
CREATE TRIGGER "urunler_eski_adres" AFTER UPDATE OF "adres_adi", "silinme_zamani" ON "urunler" FOR EACH ROW EXECUTE FUNCTION "eski_adresi_sakla"('urun');
