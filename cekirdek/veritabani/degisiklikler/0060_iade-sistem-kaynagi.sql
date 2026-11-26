-- Geri dönüş: geri alınabilir. İki denetim yeni değerleri kabul eder; eski kod onları yazmaz. Geri dönüşte daha önce yazılmış "sistem" kaynaklı, "odeme-alinmadi" nedenli iptal satırları eski kodun denetimine uymaz: denetimler yeni hâlinde bırakılır.
-- Kart 0246: süresi dolan havalenin kendiliğinden iptali iptalin tek akışından geçer (iade satırı, sistemin).
ALTER TABLE "siparis_iadeleri" DROP CONSTRAINT "siparis_iadeleri_kaynak";--> statement-breakpoint
ALTER TABLE "siparis_iadeleri" DROP CONSTRAINT "siparis_iadeleri_neden";--> statement-breakpoint
ALTER TABLE "siparis_iadeleri" ADD CONSTRAINT "siparis_iadeleri_kaynak" CHECK ("siparis_iadeleri"."kaynak" in ('yonetici', 'musteri', 'sistem'));--> statement-breakpoint
ALTER TABLE "siparis_iadeleri" ADD CONSTRAINT "siparis_iadeleri_neden" CHECK ("siparis_iadeleri"."neden" in ('musteri-vazgecti', 'beklentiyi-karsilamadi', 'kusurlu-hasarli', 'yanlis-urun', 'beden-uymadi', 'stok-yok', 'diger', 'odeme-alinmadi'));