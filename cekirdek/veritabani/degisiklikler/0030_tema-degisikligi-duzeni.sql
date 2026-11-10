-- Geri dönüş: geri alınabilir. Eski kod tema sürümlerinin önceki düzen alanını okumaz ve yazmaz; alan boş kalır, silinmez.
-- Kart 0113: tema kodu değişen geri dönüşte düzen, bir sonraki tema sürümünün bu alanındaki düzen sürümünden getirilir.
ALTER TABLE "tema_surumleri" ADD COLUMN "onceki_duzen_sira" integer;--> statement-breakpoint
ALTER TABLE "tema_surumleri" ADD CONSTRAINT "tema_surumleri_onceki_duzen" CHECK ("tema_surumleri"."onceki_duzen_sira" is null or "tema_surumleri"."onceki_duzen_sira" > 0);