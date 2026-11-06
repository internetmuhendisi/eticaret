-- Geri dönüş: geri alınabilir. Yeni tablolardır, kullanılmaya başlamadan silinerek geri alınır; rol verildikten sonra silmek yöneticilerin rollerini de siler.
CREATE TABLE "rol_izinleri" (
	"rol_kimligi" uuid NOT NULL,
	"izin" text NOT NULL,
	CONSTRAINT "rol_izinleri_rol_kimligi_izin_pk" PRIMARY KEY("rol_kimligi","izin")
);
--> statement-breakpoint
CREATE TABLE "roller" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kod" text NOT NULL,
	"tam_yetki" boolean DEFAULT false NOT NULL,
	"olusturulma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"guncellenme_zamani" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yonetici_rolleri" (
	"yonetici_kimligi" uuid NOT NULL,
	"rol_kimligi" uuid NOT NULL,
	"olusturulma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "yonetici_rolleri_yonetici_kimligi_rol_kimligi_pk" PRIMARY KEY("yonetici_kimligi","rol_kimligi")
);
--> statement-breakpoint
ALTER TABLE "rol_izinleri" ADD CONSTRAINT "rol_izinleri_rol_kimligi_roller_kimlik_fk" FOREIGN KEY ("rol_kimligi") REFERENCES "public"."roller"("kimlik") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yonetici_rolleri" ADD CONSTRAINT "yonetici_rolleri_yonetici_kimligi_yoneticiler_kimlik_fk" FOREIGN KEY ("yonetici_kimligi") REFERENCES "public"."yoneticiler"("kimlik") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yonetici_rolleri" ADD CONSTRAINT "yonetici_rolleri_rol_kimligi_roller_kimlik_fk" FOREIGN KEY ("rol_kimligi") REFERENCES "public"."roller"("kimlik") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "roller_kod_benzersiz" ON "roller" USING btree ("kod");--> statement-breakpoint
CREATE INDEX "yonetici_rolleri_rol" ON "yonetici_rolleri" USING btree ("rol_kimligi");