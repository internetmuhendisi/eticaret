-- Geri dönüş: geri alınabilir. Eski kod bu tabloyu kullanmaz, tablo ve kayıtları yerinde kalır; silinmez.
CREATE TABLE "musteri_onaylari" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"musteri_kimligi" uuid NOT NULL,
	"tur" text NOT NULL,
	"verildi" boolean NOT NULL,
	"metin_surumu" text NOT NULL,
	"zaman" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "musteri_onaylari" ADD CONSTRAINT "musteri_onaylari_musteri_kimligi_musteriler_kimlik_fk" FOREIGN KEY ("musteri_kimligi") REFERENCES "public"."musteriler"("kimlik") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "musteri_onaylari_musteri_tur" ON "musteri_onaylari" USING btree ("musteri_kimligi","tur");--> statement-breakpoint
CREATE FUNCTION "musteri_onayi_degistirilemez"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'musteri onayi sonradan degistirilemez' USING ERRCODE = 'restrict_violation';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "musteri_onaylari_degistirilemez" BEFORE UPDATE OR DELETE OR TRUNCATE ON "musteri_onaylari" FOR EACH STATEMENT EXECUTE FUNCTION "musteri_onayi_degistirilemez"();
