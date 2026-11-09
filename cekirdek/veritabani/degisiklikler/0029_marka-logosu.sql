-- Geri dönüş: geri alınabilir. Eski kod markanın ve etiketin logo alanını okumaz ve yazmaz; alan boş kalır, silinmez.
-- Kart 0111: marka logoları bölümündeki logo. Etiket için girilmez, alan iki grupta aynı biçim için vardır. Dosya silinme işaretiyle silindiği için bağ kalıcı silmeyi engeller.
ALTER TABLE "etiketler" ADD COLUMN "logo_kimligi" uuid;--> statement-breakpoint
ALTER TABLE "markalar" ADD COLUMN "logo_kimligi" uuid;--> statement-breakpoint
ALTER TABLE "etiketler" ADD CONSTRAINT "etiketler_logo_kimligi_dosyalar_kimlik_fk" FOREIGN KEY ("logo_kimligi") REFERENCES "public"."dosyalar"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "markalar" ADD CONSTRAINT "markalar_logo_kimligi_dosyalar_kimlik_fk" FOREIGN KEY ("logo_kimligi") REFERENCES "public"."dosyalar"("kimlik") ON DELETE restrict ON UPDATE no action;