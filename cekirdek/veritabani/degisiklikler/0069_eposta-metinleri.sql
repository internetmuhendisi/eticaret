-- Geri dönüş: geri alınabilir. Eski kod yeni tabloyu ve sütunu kullanmaz; mağaza sahibinin yazdığı e-posta metinleri eski kodda görünmez, e-postalar çekirdeğin metinleriyle gider.
-- Kart 0279: mağaza sahibinin e-posta metinleri (karar 0197) ve kuyruktaki e-postanın o anki metinleri.
CREATE TABLE "eposta_metinleri" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kod" text NOT NULL,
	"konu" jsonb,
	"giris" jsonb,
	"kapanis" jsonb,
	"surum" integer DEFAULT 0 NOT NULL,
	"degistiren_kimligi" uuid,
	"degisme_zamani" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "eposta_kayitlari" ADD COLUMN "metinler" jsonb;--> statement-breakpoint
CREATE UNIQUE INDEX "eposta_metinleri_kod" ON "eposta_metinleri" USING btree ("kod");