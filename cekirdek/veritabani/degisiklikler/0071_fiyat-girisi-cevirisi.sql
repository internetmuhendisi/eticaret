-- Geri dönüş: geri alınabilir. Eski kod yeni tabloyu kullanmaz (fiyat girişi orada yalnız gösterilir); kupon tetikleyicisinin eski hâli ayar olmadan aynı davranır.
-- Kart 0326: fiyat girişinin değişiklikleri (karar 0201), değiştirilemez; fiyat girişi çevrilirken kullanılmış kuponun tutar değeri değişebilir (yalnız o işlemin yerel ayarıyla).
CREATE TABLE "fiyat_girisi_gecmisi" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"zaman" timestamp with time zone DEFAULT now() NOT NULL,
	"onceki" text NOT NULL,
	"yeni" text NOT NULL,
	CONSTRAINT "fiyat_girisi_gecmisi_giris" CHECK ("fiyat_girisi_gecmisi"."onceki" in ('vergi-dahil', 'vergi-haric') and "fiyat_girisi_gecmisi"."yeni" in ('vergi-dahil', 'vergi-haric') and "fiyat_girisi_gecmisi"."onceki" <> "fiyat_girisi_gecmisi"."yeni")
);
--> statement-breakpoint
CREATE INDEX "fiyat_girisi_gecmisi_zaman" ON "fiyat_girisi_gecmisi" USING btree ("zaman");--> statement-breakpoint
CREATE FUNCTION "fiyat_girisi_gecmisi_degistirilemez"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'fiyat girisi gecmisi sonradan degistirilemez' USING ERRCODE = 'restrict_violation';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "fiyat_girisi_gecmisi_degistirilemez" BEFORE UPDATE OR DELETE OR TRUNCATE ON "fiyat_girisi_gecmisi" FOR EACH STATEMENT EXECUTE FUNCTION "fiyat_girisi_gecmisi_degistirilemez"();--> statement-breakpoint
CREATE OR REPLACE FUNCTION kupon_degismezlik() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Fiyat girişi çevrilirken (kart 0326) tutar kuponunun değeri yeni girişe çevrilir; ayar yalnız o işlemde verilir.
  IF ((NEW.kod, NEW.tur, NEW.kapsam, NEW.indirimde_gecmez) IS DISTINCT FROM
      (OLD.kod, OLD.tur, OLD.kapsam, OLD.indirimde_gecmez)
      OR (NEW.deger IS DISTINCT FROM OLD.deger
          AND current_setting('eticaret.fiyat_girisi_cevirisi', true) IS DISTINCT FROM 'acik'))
     AND kupon_kullanildi_mi(OLD.kimlik) THEN
    RAISE EXCEPTION 'kullanılmış kuponun kodu, türü, değeri ve kapsamı değişmez' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
