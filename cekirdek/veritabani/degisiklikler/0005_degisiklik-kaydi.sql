-- Geri dönüş: geri alınabilir. Eski kod bu tabloyu kullanmaz, tablo ve kayıtları yerinde kalır; silinmez.
CREATE TABLE "degisiklik_kayitlari" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"zaman" timestamp with time zone DEFAULT now() NOT NULL,
	"kim_turu" text NOT NULL,
	"kim_kimligi" uuid,
	"kim_adi" text,
	"islem" text NOT NULL,
	"kayit_turu" text NOT NULL,
	"kayit_kimligi" uuid NOT NULL,
	"eski_deger" jsonb,
	"yeni_deger" jsonb,
	CONSTRAINT "degisiklik_kayitlari_kim_dolu" CHECK (("degisiklik_kayitlari"."kim_turu" = 'sistem' and length("degisiklik_kayitlari"."kim_adi") > 0 and "degisiklik_kayitlari"."kim_kimligi" is null) or ("degisiklik_kayitlari"."kim_turu" in ('yonetici', 'musteri', 'sahip') and "degisiklik_kayitlari"."kim_kimligi" is not null and "degisiklik_kayitlari"."kim_adi" is null))
);
--> statement-breakpoint
CREATE INDEX "degisiklik_kayitlari_kayit" ON "degisiklik_kayitlari" USING btree ("kayit_turu","kayit_kimligi");--> statement-breakpoint
CREATE INDEX "degisiklik_kayitlari_kim" ON "degisiklik_kayitlari" USING btree ("kim_kimligi");--> statement-breakpoint
CREATE INDEX "degisiklik_kayitlari_zaman" ON "degisiklik_kayitlari" USING btree ("zaman");--> statement-breakpoint
CREATE FUNCTION "degisiklik_kaydi_degistirilemez"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'degisiklik kaydi sonradan degistirilemez' USING ERRCODE = 'restrict_violation';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "degisiklik_kayitlari_degistirilemez" BEFORE UPDATE OR DELETE OR TRUNCATE ON "degisiklik_kayitlari" FOR EACH STATEMENT EXECUTE FUNCTION "degisiklik_kaydi_degistirilemez"();
