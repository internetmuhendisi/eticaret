-- Geri dönüş: geri alınabilir. Eski kod urun_ilgilileri tablosunu kullanmaz; tablo yerinde kalır, silinmez.
CREATE TABLE "urun_ilgilileri" (
	"urun_kimligi" uuid NOT NULL,
	"ilgili_kimligi" uuid NOT NULL,
	"sira" integer NOT NULL,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "urun_ilgilileri_urun_kimligi_ilgili_kimligi_pk" PRIMARY KEY("urun_kimligi","ilgili_kimligi"),
	CONSTRAINT "urun_ilgilileri_kendisi" CHECK ("urun_ilgilileri"."urun_kimligi" <> "urun_ilgilileri"."ilgili_kimligi")
);
--> statement-breakpoint
ALTER TABLE "urun_ilgilileri" ADD CONSTRAINT "urun_ilgilileri_urun_kimligi_urunler_kimlik_fk" FOREIGN KEY ("urun_kimligi") REFERENCES "public"."urunler"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "urun_ilgilileri" ADD CONSTRAINT "urun_ilgilileri_ilgili_kimligi_urunler_kimlik_fk" FOREIGN KEY ("ilgili_kimligi") REFERENCES "public"."urunler"("kimlik") ON DELETE restrict ON UPDATE no action;