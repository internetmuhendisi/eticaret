-- Geri dönüş: geri alınabilir. Yeni tablo; eski kod tabloyu bilmez. Geri dönüşte tablo kalır, notlar okunmaz.
-- Kart 0271: mağazanın müşteri hakkındaki notları, yalnız panelde (karar 0173).
CREATE TABLE "musteri_notlari" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"musteri_kimligi" uuid NOT NULL,
	"zaman" timestamp with time zone DEFAULT now() NOT NULL,
	"metin" text NOT NULL,
	"kim_turu" text NOT NULL,
	"kim_kimligi" uuid,
	"kim_adi" text,
	CONSTRAINT "musteri_notlari_metin" CHECK (length("musteri_notlari"."metin") between 1 and 1000),
	CONSTRAINT "musteri_notlari_kim_dolu" CHECK (("musteri_notlari"."kim_turu" = 'sistem' and length("musteri_notlari"."kim_adi") > 0 and "musteri_notlari"."kim_kimligi" is null) or ("musteri_notlari"."kim_turu" in ('yonetici', 'musteri', 'sahip') and "musteri_notlari"."kim_kimligi" is not null and "musteri_notlari"."kim_adi" is null))
);
--> statement-breakpoint
ALTER TABLE "musteri_notlari" ADD CONSTRAINT "musteri_notlari_musteri_kimligi_musteriler_kimlik_fk" FOREIGN KEY ("musteri_kimligi") REFERENCES "public"."musteriler"("kimlik") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "musteri_notlari_musteri" ON "musteri_notlari" USING btree ("musteri_kimligi","zaman");