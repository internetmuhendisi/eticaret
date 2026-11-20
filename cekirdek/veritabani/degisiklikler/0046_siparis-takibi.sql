-- Geri dönüş: geri alınabilir. Yeni tablo; geri almak için tablo kaldırılır (DROP TABLE "siparis_takip_erisimleri"), açık takip oturumları kapanır.
-- Kart 0238: üye olmayanın sipariş takibi (karar 0150).
CREATE TABLE "siparis_takip_erisimleri" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"siparis_kimligi" uuid NOT NULL,
	"ozet" text NOT NULL,
	"bitis_zamani" timestamp with time zone NOT NULL,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "siparis_takip_erisimleri" ADD CONSTRAINT "siparis_takip_erisimleri_siparis_kimligi_siparisler_kimlik_fk" FOREIGN KEY ("siparis_kimligi") REFERENCES "public"."siparisler"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "siparis_takip_erisimleri_ozet" ON "siparis_takip_erisimleri" USING btree ("ozet");--> statement-breakpoint
CREATE INDEX "siparis_takip_erisimleri_bitis" ON "siparis_takip_erisimleri" USING btree ("bitis_zamani");