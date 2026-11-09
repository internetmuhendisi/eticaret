-- Geri dönüş: geri alınabilir. Eski kod düzen sürümleri tablosunu ve tetikleyicisini kullanmaz; ikisi de yerinde kalır, silinmez.
CREATE TABLE "duzen_surumleri" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sira" integer NOT NULL,
	"duzen" jsonb NOT NULL,
	"zaman" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "duzen_surumleri_sira_pozitif" CHECK ("duzen_surumleri"."sira" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "duzen_surumleri_sira" ON "duzen_surumleri" USING btree ("sira");--> statement-breakpoint
CREATE FUNCTION "duzen_surumleri_degistirilemez"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'duzen surumleri sonradan degistirilemez' USING ERRCODE = 'restrict_violation';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "duzen_surumleri_degistirilemez" BEFORE UPDATE OR DELETE OR TRUNCATE ON "duzen_surumleri" FOR EACH STATEMENT EXECUTE FUNCTION "duzen_surumleri_degistirilemez"();