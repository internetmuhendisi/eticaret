-- Geri dönüş: geri alınabilir. Eski kod marka ve etiket tablolarını ve görevlinin marka ve etiket izinlerini kullanmaz; hepsi yerinde kalır. Kategori kardeş adı indeksi noktalı noktasız i ayrımsız yeniden kurulur; eski kod onu da kullanabilir (yalnız daha sıkıdır). Yayında kategori verisi olan site yok, indeks çakışmasız kurulur.
CREATE TABLE "etiketler" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ad" text NOT NULL,
	"adres_adi" text NOT NULL,
	"aciklama" text,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"guncellenme_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"silinme_zamani" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "urun_etiketleri" (
	"urun_kimligi" uuid NOT NULL,
	"grup_kimligi" uuid NOT NULL,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "urun_etiketleri_urun_kimligi_grup_kimligi_pk" PRIMARY KEY("urun_kimligi","grup_kimligi")
);
--> statement-breakpoint
CREATE TABLE "markalar" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ad" text NOT NULL,
	"adres_adi" text NOT NULL,
	"aciklama" text,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"guncellenme_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"silinme_zamani" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "urun_markalari" (
	"urun_kimligi" uuid NOT NULL,
	"grup_kimligi" uuid NOT NULL,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "urun_markalari_urun_kimligi_pk" PRIMARY KEY("urun_kimligi")
);
--> statement-breakpoint
DROP INDEX "kategoriler_kardes_adi";--> statement-breakpoint
ALTER TABLE "urun_etiketleri" ADD CONSTRAINT "urun_etiketleri_urun_kimligi_urunler_kimlik_fk" FOREIGN KEY ("urun_kimligi") REFERENCES "public"."urunler"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "urun_etiketleri" ADD CONSTRAINT "urun_etiketleri_grup_kimligi_etiketler_kimlik_fk" FOREIGN KEY ("grup_kimligi") REFERENCES "public"."etiketler"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "urun_markalari" ADD CONSTRAINT "urun_markalari_urun_kimligi_urunler_kimlik_fk" FOREIGN KEY ("urun_kimligi") REFERENCES "public"."urunler"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "urun_markalari" ADD CONSTRAINT "urun_markalari_grup_kimligi_markalar_kimlik_fk" FOREIGN KEY ("grup_kimligi") REFERENCES "public"."markalar"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "etiketler_adi" ON "etiketler" USING btree (lower(translate("ad", 'İIı', 'iii'))) WHERE "etiketler"."silinme_zamani" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "etiketler_adres_adi" ON "etiketler" USING btree ("adres_adi") WHERE "etiketler"."silinme_zamani" is null;--> statement-breakpoint
CREATE INDEX "urun_etiketleri_grup" ON "urun_etiketleri" USING btree ("grup_kimligi");--> statement-breakpoint
CREATE UNIQUE INDEX "markalar_adi" ON "markalar" USING btree (lower(translate("ad", 'İIı', 'iii'))) WHERE "markalar"."silinme_zamani" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "markalar_adres_adi" ON "markalar" USING btree ("adres_adi") WHERE "markalar"."silinme_zamani" is null;--> statement-breakpoint
CREATE INDEX "urun_markalari_grup" ON "urun_markalari" USING btree ("grup_kimligi");--> statement-breakpoint
CREATE UNIQUE INDEX "kategoriler_kardes_adi" ON "kategoriler" USING btree (coalesce("ust_kimligi", '00000000-0000-0000-0000-000000000000'::uuid),lower(translate("ad", 'İIı', 'iii'))) WHERE "kategoriler"."silinme_zamani" is null;--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'marka.gor' FROM "roller" WHERE "kod" = 'gorevli';--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'marka.degistir' FROM "roller" WHERE "kod" = 'gorevli';--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'etiket.gor' FROM "roller" WHERE "kod" = 'gorevli';--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'etiket.degistir' FROM "roller" WHERE "kod" = 'gorevli';
