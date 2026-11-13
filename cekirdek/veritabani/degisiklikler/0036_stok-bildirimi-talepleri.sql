-- Geri dönüş: geri alınabilir. Eski kod talep tablosunu kullanmaz; tablo yerinde kalır. Yeni tablo başka tabloya yazmaz.
-- Kart 0144: stoğa gelince haber ver eklentisinin talepleri (karar 0117).
CREATE TABLE "stok_bildirimi_talepleri" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"birim_kimligi" uuid NOT NULL,
	"eposta" text,
	"durum" text NOT NULL,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"gonderilme_zamani" timestamp with time zone,
	CONSTRAINT "stok_bildirimi_talepleri_durum" CHECK ("stok_bildirimi_talepleri"."durum" in ('bekliyor', 'gonderildi')),
	CONSTRAINT "stok_bildirimi_talepleri_eposta" CHECK (("stok_bildirimi_talepleri"."durum" = 'bekliyor' and "stok_bildirimi_talepleri"."eposta" is not null and "stok_bildirimi_talepleri"."gonderilme_zamani" is null) or ("stok_bildirimi_talepleri"."durum" = 'gonderildi' and "stok_bildirimi_talepleri"."eposta" is null and "stok_bildirimi_talepleri"."gonderilme_zamani" is not null))
);
--> statement-breakpoint
ALTER TABLE "stok_bildirimi_talepleri" ADD CONSTRAINT "stok_bildirimi_talepleri_birim_kimligi_urun_birimleri_kimlik_fk" FOREIGN KEY ("birim_kimligi") REFERENCES "public"."urun_birimleri"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "stok_bildirimi_talepleri_bekleyen" ON "stok_bildirimi_talepleri" USING btree ("birim_kimligi","eposta") WHERE "stok_bildirimi_talepleri"."durum" = 'bekliyor';--> statement-breakpoint
CREATE INDEX "stok_bildirimi_talepleri_zaman" ON "stok_bildirimi_talepleri" USING btree ("olusturma_zamani");