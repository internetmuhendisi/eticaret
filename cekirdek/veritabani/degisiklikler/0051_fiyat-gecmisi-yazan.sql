-- Geri dönüş: geri alınabilir. Eski kod yeni sütunlara yazmaz, boş kalırlar; boş üçlü denetimden geçer.
-- Kart 0265: fiyat geçmişine değişikliği yapan (stok geçmişiyle aynı biçim), panelin fiyat geçmişinin "Yazan" sütunu.
ALTER TABLE "fiyat_gecmisi" ADD COLUMN "kim_turu" text;--> statement-breakpoint
ALTER TABLE "fiyat_gecmisi" ADD COLUMN "kim_kimligi" uuid;--> statement-breakpoint
ALTER TABLE "fiyat_gecmisi" ADD COLUMN "kim_adi" text;--> statement-breakpoint
ALTER TABLE "fiyat_gecmisi" ADD CONSTRAINT "fiyat_gecmisi_kim" CHECK (("fiyat_gecmisi"."kim_turu" is null and "fiyat_gecmisi"."kim_kimligi" is null and "fiyat_gecmisi"."kim_adi" is null) or ("fiyat_gecmisi"."kim_turu" = 'sistem' and length("fiyat_gecmisi"."kim_adi") > 0 and "fiyat_gecmisi"."kim_kimligi" is null) or ("fiyat_gecmisi"."kim_turu" in ('yonetici', 'musteri', 'sahip') and "fiyat_gecmisi"."kim_kimligi" is not null and "fiyat_gecmisi"."kim_adi" is null));