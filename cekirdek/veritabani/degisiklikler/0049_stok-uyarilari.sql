-- Geri dönüş: geri alınabilir. Yeni tablo eski kodda okunmaz; geri dönmek için tablo kaldırılır, bekleyen stok uyarıları kaybolur (yalnız bildirimdir).
-- Kart 0241: yönetici bildirimlerinin stok uyarıları (karar 0154).
CREATE TABLE "stok_uyarilari" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"birim_kimligi" uuid NOT NULL,
	"tur" text NOT NULL,
	"miktar" integer NOT NULL,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"islenme_zamani" timestamp with time zone,
	"gonderim_zamani" timestamp with time zone,
	CONSTRAINT "stok_uyarilari_tur" CHECK ("stok_uyarilari"."tur" in ('dusuk', 'tukendi')),
	CONSTRAINT "stok_uyarilari_gonderim" CHECK ("stok_uyarilari"."gonderim_zamani" is null or "stok_uyarilari"."islenme_zamani" is not null)
);
--> statement-breakpoint
ALTER TABLE "stok_uyarilari" ADD CONSTRAINT "stok_uyarilari_birim_kimligi_urun_birimleri_kimlik_fk" FOREIGN KEY ("birim_kimligi") REFERENCES "public"."urun_birimleri"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stok_uyarilari_bekleyen" ON "stok_uyarilari" USING btree ("olusturma_zamani") WHERE "stok_uyarilari"."islenme_zamani" is null;--> statement-breakpoint
CREATE INDEX "stok_uyarilari_gonderim" ON "stok_uyarilari" USING btree ("gonderim_zamani") WHERE "stok_uyarilari"."gonderim_zamani" is not null;