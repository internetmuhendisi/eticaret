-- Geri dönüş: geri alınabilir. Eski kod eski adresler tablosunu okumaz; tablo, işlev ve tetikleyiciler yerinde kalır, silinmez. Tetikleyiciler eski kodda da çalışır, yalnız tabloya satır ekler.
-- Kart 0135 (karar 0103): kategori, marka, etiket ya da ürünün adres adı değişince eski ad saklanır, vitrin eski adrese geleni bugünkü adrese kalıcı olarak yönlendirir.
CREATE TABLE "eski_adresler" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kayit_turu" text NOT NULL,
	"kayit_kimligi" uuid NOT NULL,
	"adres_adi" text NOT NULL,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "eski_adresler_tur" CHECK ("eski_adresler"."kayit_turu" in ('kategori', 'marka', 'etiket', 'urun'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "eski_adresler_adres" ON "eski_adresler" USING btree ("kayit_turu","adres_adi");
--> statement-breakpoint
-- Adres adı değişince eski adı saklar. Tür tetikleyicinin argümanıdır. Ad daha önce başka bir kaydın eski adıysa
-- satır bu kayda geçer: en son bırakan kazanır.
CREATE OR REPLACE FUNCTION "eski_adresi_sakla"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."adres_adi" IS DISTINCT FROM OLD."adres_adi" THEN
    INSERT INTO "eski_adresler" ("kayit_turu", "kayit_kimligi", "adres_adi")
    VALUES (TG_ARGV[0], OLD."kimlik", OLD."adres_adi")
    ON CONFLICT ("kayit_turu", "adres_adi")
    DO UPDATE SET "kayit_kimligi" = EXCLUDED."kayit_kimligi", "olusturma_zamani" = now();
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "kategoriler_eski_adres" AFTER UPDATE OF "adres_adi" ON "kategoriler" FOR EACH ROW EXECUTE FUNCTION "eski_adresi_sakla"('kategori');--> statement-breakpoint
CREATE TRIGGER "markalar_eski_adres" AFTER UPDATE OF "adres_adi" ON "markalar" FOR EACH ROW EXECUTE FUNCTION "eski_adresi_sakla"('marka');--> statement-breakpoint
CREATE TRIGGER "etiketler_eski_adres" AFTER UPDATE OF "adres_adi" ON "etiketler" FOR EACH ROW EXECUTE FUNCTION "eski_adresi_sakla"('etiket');--> statement-breakpoint
CREATE TRIGGER "urunler_eski_adres" AFTER UPDATE OF "adres_adi" ON "urunler" FOR EACH ROW EXECUTE FUNCTION "eski_adresi_sakla"('urun');
