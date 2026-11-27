-- Geri dönüş: geri alınabilir. Eski kod yeni tabloyu kullanmaz; panel bildirimleri eski kodda görünmez, e-postalar değişmeden gider.
-- Kart 0280: panelin içindeki bildirimler (karar 0198).
CREATE TABLE "panel_bildirimleri" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"yonetici_kimligi" uuid NOT NULL,
	"bildirim" text NOT NULL,
	"anahtar" text NOT NULL,
	"kayit_kimligi" uuid,
	"ozet" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"olusturma_zamani" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"okunma_zamani" timestamp with time zone,
	CONSTRAINT "panel_bildirimleri_bildirim" CHECK ("panel_bildirimleri"."bildirim" in ('yeni-siparis', 'havale-bildirimi', 'iade-talebi', 'iptal', 'stok', 'yorum', 'kartla-odeme-uyusmazligi', 'bekleyen-iade'))
);
--> statement-breakpoint
ALTER TABLE "panel_bildirimleri" ADD CONSTRAINT "panel_bildirimleri_yonetici_kimligi_yoneticiler_kimlik_fk" FOREIGN KEY ("yonetici_kimligi") REFERENCES "public"."yoneticiler"("kimlik") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "panel_bildirimleri_anahtar" ON "panel_bildirimleri" USING btree ("yonetici_kimligi","anahtar");--> statement-breakpoint
CREATE INDEX "panel_bildirimleri_liste" ON "panel_bildirimleri" USING btree ("yonetici_kimligi","olusturma_zamani","kimlik");--> statement-breakpoint
CREATE INDEX "panel_bildirimleri_okunmamis" ON "panel_bildirimleri" USING btree ("yonetici_kimligi") WHERE "panel_bildirimleri"."okunma_zamani" is null;--> statement-breakpoint
CREATE INDEX "panel_bildirimleri_okunan" ON "panel_bildirimleri" USING btree ("okunma_zamani") WHERE "panel_bildirimleri"."okunma_zamani" is not null;