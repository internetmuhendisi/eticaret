-- Geri dönüş: geri alınabilir. Eski kod kategorinin görsel alanını okumaz ve yazmaz; alan boş kalır, silinmez.
-- Kart 0110: kategori kutularındaki görsel. Dosya silinme işaretiyle silindiği için bağ kalıcı silmeyi engeller.
ALTER TABLE "kategoriler" ADD COLUMN "gorsel_kimligi" uuid;--> statement-breakpoint
ALTER TABLE "kategoriler" ADD CONSTRAINT "kategoriler_gorsel_kimligi_dosyalar_kimlik_fk" FOREIGN KEY ("gorsel_kimligi") REFERENCES "public"."dosyalar"("kimlik") ON DELETE restrict ON UPDATE no action;
