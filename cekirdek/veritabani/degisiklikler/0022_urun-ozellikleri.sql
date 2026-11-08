-- Geri dönüş: geri alınabilir. Eski kod özellik tablolarını ve görevlinin özellik izinlerini kullanmaz; hepsi yerinde kalır. Yeni tablolar başka tabloya dokunmaz.
CREATE TABLE "ozellik_secenekleri" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ozellik_kimligi" uuid NOT NULL,
	"ad" text NOT NULL,
	"sira" integer DEFAULT 0 NOT NULL,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"guncellenme_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"silinme_zamani" timestamp with time zone,
	CONSTRAINT "ozellik_secenekleri_kimlik_ozellik" UNIQUE("kimlik","ozellik_kimligi")
);
--> statement-breakpoint
CREATE TABLE "ozellikler" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ad" text NOT NULL,
	"tur" text NOT NULL,
	"birim" text,
	"filtrede" boolean DEFAULT false NOT NULL,
	"sira" integer DEFAULT 0 NOT NULL,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"guncellenme_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"silinme_zamani" timestamp with time zone,
	CONSTRAINT "ozellikler_kimlik_tur" UNIQUE("kimlik","tur"),
	CONSTRAINT "ozellikler_tur" CHECK ("ozellikler"."tur" in ('metin', 'sayi', 'evet-hayir', 'liste')),
	CONSTRAINT "ozellikler_birim" CHECK ("ozellikler"."birim" is null or "ozellikler"."tur" = 'sayi')
);
--> statement-breakpoint
CREATE TABLE "urun_ozellik_degerleri" (
	"urun_kimligi" uuid NOT NULL,
	"ozellik_kimligi" uuid NOT NULL,
	"tur" text NOT NULL,
	"metin_degeri" text,
	"sayi_degeri" numeric(16, 4),
	"evet_hayir_degeri" boolean,
	"secenek_kimligi" uuid,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "urun_ozellik_degerleri_urun_kimligi_ozellik_kimligi_pk" PRIMARY KEY("urun_kimligi","ozellik_kimligi"),
	CONSTRAINT "urun_ozellik_degerleri_deger" CHECK (("urun_ozellik_degerleri"."tur" = 'metin') = ("urun_ozellik_degerleri"."metin_degeri" is not null)
        and ("urun_ozellik_degerleri"."tur" = 'sayi') = ("urun_ozellik_degerleri"."sayi_degeri" is not null)
        and ("urun_ozellik_degerleri"."tur" = 'evet-hayir') = ("urun_ozellik_degerleri"."evet_hayir_degeri" is not null)
        and ("urun_ozellik_degerleri"."tur" = 'liste') = ("urun_ozellik_degerleri"."secenek_kimligi" is not null))
);
--> statement-breakpoint
ALTER TABLE "ozellik_secenekleri" ADD CONSTRAINT "ozellik_secenekleri_ozellik_kimligi_ozellikler_kimlik_fk" FOREIGN KEY ("ozellik_kimligi") REFERENCES "public"."ozellikler"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "urun_ozellik_degerleri" ADD CONSTRAINT "urun_ozellik_degerleri_urun_kimligi_urunler_kimlik_fk" FOREIGN KEY ("urun_kimligi") REFERENCES "public"."urunler"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "urun_ozellik_degerleri" ADD CONSTRAINT "urun_ozellik_degerleri_ozellik" FOREIGN KEY ("ozellik_kimligi","tur") REFERENCES "public"."ozellikler"("kimlik","tur") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "urun_ozellik_degerleri" ADD CONSTRAINT "urun_ozellik_degerleri_secenek" FOREIGN KEY ("secenek_kimligi","ozellik_kimligi") REFERENCES "public"."ozellik_secenekleri"("kimlik","ozellik_kimligi") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ozellik_secenekleri_ad" ON "ozellik_secenekleri" USING btree ("ozellik_kimligi",lower(translate("ad", 'İIı', 'iii'))) WHERE "ozellik_secenekleri"."silinme_zamani" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "ozellikler_adi" ON "ozellikler" USING btree (lower(translate("ad", 'İIı', 'iii'))) WHERE "ozellikler"."silinme_zamani" is null;--> statement-breakpoint
CREATE INDEX "urun_ozellik_degerleri_secenek" ON "urun_ozellik_degerleri" USING btree ("ozellik_kimligi","secenek_kimligi");--> statement-breakpoint
CREATE INDEX "urun_ozellik_degerleri_sayi" ON "urun_ozellik_degerleri" USING btree ("ozellik_kimligi","sayi_degeri");--> statement-breakpoint
CREATE INDEX "urun_ozellik_degerleri_evet_hayir" ON "urun_ozellik_degerleri" USING btree ("ozellik_kimligi","evet_hayir_degeri");--> statement-breakpoint
CREATE INDEX "urun_ozellik_degerleri_metin" ON "urun_ozellik_degerleri" USING btree ("ozellik_kimligi",lower(translate("metin_degeri", 'İIı', 'iii')));--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'ozellik.gor' FROM "roller" WHERE "kod" = 'gorevli';--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'ozellik.degistir' FROM "roller" WHERE "kod" = 'gorevli';
