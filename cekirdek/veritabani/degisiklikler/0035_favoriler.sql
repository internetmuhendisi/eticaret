-- Geri dönüş: geri alınabilir. Eski kod favori tablosunu kullanmaz; tablo yerinde kalır. Yeni tablo başka tabloya yazmaz.
-- Kart 0140: girişli müşterinin favorileri (karar 0110). Üye olmayan müşterininkiler tarayıcısındadır.
CREATE TABLE "favoriler" (
	"musteri_kimligi" uuid NOT NULL,
	"urun_kimligi" uuid NOT NULL,
	"eklenme_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favoriler_musteri_kimligi_urun_kimligi_pk" PRIMARY KEY("musteri_kimligi","urun_kimligi")
);
--> statement-breakpoint
ALTER TABLE "favoriler" ADD CONSTRAINT "favoriler_musteri_kimligi_musteriler_kimlik_fk" FOREIGN KEY ("musteri_kimligi") REFERENCES "public"."musteriler"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favoriler" ADD CONSTRAINT "favoriler_urun_kimligi_urunler_kimlik_fk" FOREIGN KEY ("urun_kimligi") REFERENCES "public"."urunler"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "favoriler_musteri_zaman" ON "favoriler" USING btree ("musteri_kimligi","eklenme_zamani");