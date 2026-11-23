-- Geri dönüş: geri alınabilir. Eski kod yeni sütunlara yazmaz, boş kalırlar; boş dörtlü denetimden geçer.
-- Kart 0268: siparişin faturası (numara, tarih, isteğe bağlı PDF ve yazıldığı an), karar 0170.
ALTER TABLE "siparisler" ADD COLUMN "fatura_numarasi" text;--> statement-breakpoint
ALTER TABLE "siparisler" ADD COLUMN "fatura_tarihi" date;--> statement-breakpoint
ALTER TABLE "siparisler" ADD COLUMN "fatura_dosyasi" uuid;--> statement-breakpoint
ALTER TABLE "siparisler" ADD COLUMN "fatura_zamani" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "siparisler" ADD CONSTRAINT "siparisler_fatura_dosyasi_dosyalar_kimlik_fk" FOREIGN KEY ("fatura_dosyasi") REFERENCES "public"."dosyalar"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siparisler" ADD CONSTRAINT "siparisler_fatura" CHECK (("siparisler"."fatura_numarasi" is null) = ("siparisler"."fatura_tarihi" is null) and ("siparisler"."fatura_numarasi" is null) = ("siparisler"."fatura_zamani" is null) and ("siparisler"."fatura_dosyasi" is null or "siparisler"."fatura_numarasi" is not null) and ("siparisler"."fatura_numarasi" is null or length("siparisler"."fatura_numarasi") between 1 and 60));