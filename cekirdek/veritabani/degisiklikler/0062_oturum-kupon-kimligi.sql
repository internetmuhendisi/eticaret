-- Geri dönüş: geri alınabilir. Yeni alan boş başlar, eski kod okumaz; daraltılan denetim (yüzde en çok 99) eski kodun yazmadığı değeri reddeder. Yüzde 100 kupon varsa değişiklik uygulanmaz: kupon önce düzeltilir.
-- Kart 0312 (bağımsız kontrolün bulgusu ve kullanıcı kararı): ödeme oturumu kuponu kimliğiyle saklar; kupon ürünleri sıfıra indiremez.
ALTER TABLE "kuponlar" DROP CONSTRAINT "kuponlar_deger";--> statement-breakpoint
ALTER TABLE "odeme_oturumlari" ADD COLUMN "kupon_kimligi" uuid;--> statement-breakpoint
ALTER TABLE "odeme_oturumlari" ADD CONSTRAINT "odeme_oturumlari_kupon_kimligi_kuponlar_kimlik_fk" FOREIGN KEY ("kupon_kimligi") REFERENCES "public"."kuponlar"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kuponlar" ADD CONSTRAINT "kuponlar_deger" CHECK (("kuponlar"."tur" = 'yuzde' and "kuponlar"."deger" between 1 and 99)
        or ("kuponlar"."tur" = 'tutar' and "kuponlar"."deger" > 0)
        or ("kuponlar"."tur" = 'ucretsiz-kargo' and "kuponlar"."deger" = 0));