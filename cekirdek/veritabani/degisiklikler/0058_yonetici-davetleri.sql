-- Geri dönüş: geri alınabilir. Yeni iki tablo ve yöneticinin boş başlayan "ad" alanı; eski kod onları bilmez, kullanmaz. Geri dönüşte bekleyen davetler kabul edilemez (eski kodda sayfası yok), yeniden gönderilir.
-- Kart 0275 (karar 0179): ekibe davet ve yöneticinin adı.
CREATE TABLE "yonetici_davet_rolleri" (
	"davet_kimligi" uuid NOT NULL,
	"rol_kimligi" uuid NOT NULL,
	CONSTRAINT "yonetici_davet_rolleri_davet_kimligi_rol_kimligi_pk" PRIMARY KEY("davet_kimligi","rol_kimligi")
);
--> statement-breakpoint
CREATE TABLE "yonetici_davetleri" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"eposta" text NOT NULL,
	"anahtar_ozeti" text NOT NULL,
	"davet_eden" uuid NOT NULL,
	"bitis" timestamp with time zone NOT NULL,
	"kullanilma_zamani" timestamp with time zone,
	"geri_alinma_zamani" timestamp with time zone,
	"yonetici_kimligi" uuid,
	"olusturulma_zamani" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "yoneticiler" ADD COLUMN "ad" text;--> statement-breakpoint
ALTER TABLE "yonetici_davet_rolleri" ADD CONSTRAINT "yonetici_davet_rolleri_davet_kimligi_yonetici_davetleri_kimlik_fk" FOREIGN KEY ("davet_kimligi") REFERENCES "public"."yonetici_davetleri"("kimlik") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yonetici_davet_rolleri" ADD CONSTRAINT "yonetici_davet_rolleri_rol_kimligi_roller_kimlik_fk" FOREIGN KEY ("rol_kimligi") REFERENCES "public"."roller"("kimlik") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yonetici_davetleri" ADD CONSTRAINT "yonetici_davetleri_davet_eden_yoneticiler_kimlik_fk" FOREIGN KEY ("davet_eden") REFERENCES "public"."yoneticiler"("kimlik") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yonetici_davetleri" ADD CONSTRAINT "yonetici_davetleri_yonetici_kimligi_yoneticiler_kimlik_fk" FOREIGN KEY ("yonetici_kimligi") REFERENCES "public"."yoneticiler"("kimlik") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "yonetici_davetleri_anahtar_benzersiz" ON "yonetici_davetleri" USING btree ("anahtar_ozeti");--> statement-breakpoint
CREATE INDEX "yonetici_davetleri_eposta" ON "yonetici_davetleri" USING btree ("eposta");--> statement-breakpoint
CREATE INDEX "yonetici_davetleri_bitis" ON "yonetici_davetleri" USING btree ("bitis");--> statement-breakpoint
CREATE INDEX "yonetici_davetleri_davet_eden" ON "yonetici_davetleri" USING btree ("davet_eden");
