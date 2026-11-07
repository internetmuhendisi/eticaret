-- Geri dönüş: geri alınabilir. Eski kod bu tabloyu kullanmaz, tablo ve kayıtları yerinde kalır; silinmez.
CREATE TABLE "arka_plan_isleri" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tur" text NOT NULL,
	"girdi" jsonb NOT NULL,
	"durum" text NOT NULL,
	"deneme_sayisi" integer DEFAULT 0 NOT NULL,
	"en_cok_deneme" integer NOT NULL,
	"calisma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"kilit_sahibi" text,
	"kilit_bitis" timestamp with time zone,
	"son_hata" text,
	"tekillik_anahtari" text,
	"olusturulma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"bitis_zamani" timestamp with time zone,
	CONSTRAINT "arka_plan_isleri_tekillik_anahtari_unique" UNIQUE("tekillik_anahtari"),
	CONSTRAINT "arka_plan_isleri_durum" CHECK ("arka_plan_isleri"."durum" in ('bekliyor', 'calisiyor', 'bitti', 'hata'))
);
--> statement-breakpoint
CREATE INDEX "arka_plan_isleri_siradaki" ON "arka_plan_isleri" USING btree ("calisma_zamani") WHERE "arka_plan_isleri"."durum" = 'bekliyor';--> statement-breakpoint
CREATE INDEX "arka_plan_isleri_kilit" ON "arka_plan_isleri" USING btree ("kilit_bitis") WHERE "arka_plan_isleri"."durum" = 'calisiyor';--> statement-breakpoint
CREATE INDEX "arka_plan_isleri_biten" ON "arka_plan_isleri" USING btree ("bitis_zamani") WHERE "arka_plan_isleri"."durum" = 'bitti';--> statement-breakpoint
CREATE INDEX "arka_plan_isleri_hatali" ON "arka_plan_isleri" USING btree ("olusturulma_zamani") WHERE "arka_plan_isleri"."durum" = 'hata';