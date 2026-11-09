-- Geri dönüş: geri alınabilir. Eski kod tema sürümleri tablosunu ve tetikleyicisini kullanmaz; ikisi de yerinde kalır, silinmez. Eski kod vitrini başlangıç değerleriyle açar.
CREATE TABLE "tema_surumleri" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sira" integer NOT NULL,
	"tema" text NOT NULL,
	"ayarlar" jsonb NOT NULL,
	"geri_donulen_sira" integer,
	"zaman" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tema_surumleri_sira_pozitif" CHECK ("tema_surumleri"."sira" > 0),
	CONSTRAINT "tema_surumleri_geri_donulen" CHECK ("tema_surumleri"."geri_donulen_sira" is null or ("tema_surumleri"."geri_donulen_sira" > 0 and "tema_surumleri"."geri_donulen_sira" < "tema_surumleri"."sira"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "tema_surumleri_sira" ON "tema_surumleri" USING btree ("sira");--> statement-breakpoint
CREATE FUNCTION "tema_surumleri_degistirilemez"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'tema surumleri sonradan degistirilemez' USING ERRCODE = 'restrict_violation';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "tema_surumleri_degistirilemez" BEFORE UPDATE OR DELETE OR TRUNCATE ON "tema_surumleri" FOR EACH STATEMENT EXECUTE FUNCTION "tema_surumleri_degistirilemez"();