-- Geri dönüş: geri alınabilir. Yeni tablo ve geçmişin yeni nedeni (adres-duzeltildi); eski kod tabloyu kullanmaz, düzeltme yapmaz. Geri dönüşte daha önce yazılmış "adres-duzeltildi" satırları geçmişte kalır, eski kod onları adsız gösterebilir.
-- Kart 0269 (karar 0180): siparişin teslimat ve fatura bilgilerinin panelden düzeltilmesi.
CREATE TABLE "siparis_adres_duzeltmeleri" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"siparis_kimligi" uuid NOT NULL,
	"gecmis_kimligi" uuid NOT NULL,
	"onceki_teslimat" jsonb NOT NULL,
	"onceki_fatura" jsonb NOT NULL,
	"yeni_teslimat" jsonb NOT NULL,
	"yeni_fatura" jsonb NOT NULL,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "siparis_gecmisi" DROP CONSTRAINT "siparis_gecmisi_neden";--> statement-breakpoint
ALTER TABLE "siparis_adres_duzeltmeleri" ADD CONSTRAINT "siparis_adres_duzeltmeleri_siparis_kimligi_siparisler_kimlik_fk" FOREIGN KEY ("siparis_kimligi") REFERENCES "public"."siparisler"("kimlik") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siparis_adres_duzeltmeleri" ADD CONSTRAINT "siparis_adres_duzeltmeleri_gecmis_kimligi_siparis_gecmisi_kimlik_fk" FOREIGN KEY ("gecmis_kimligi") REFERENCES "public"."siparis_gecmisi"("kimlik") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "siparis_adres_duzeltmeleri_gecmis" ON "siparis_adres_duzeltmeleri" USING btree ("gecmis_kimligi");--> statement-breakpoint
CREATE INDEX "siparis_adres_duzeltmeleri_siparis" ON "siparis_adres_duzeltmeleri" USING btree ("siparis_kimligi");--> statement-breakpoint
ALTER TABLE "siparis_gecmisi" ADD CONSTRAINT "siparis_gecmisi_neden" CHECK ("siparis_gecmisi"."neden" in ('olusturuldu', 'panelden-olusturuldu', 'havale-suresi-doldu', 'havale-bildirildi', 'havale-onaylandi', 'hazirlamaya-alindi', 'kargoya-verildi', 'kargo-duzeltildi', 'teslim-edildi', 'yonetici-iptali', 'iade-yapildi', 'iade-talebi-alindi', 'iade-talebi-onaylandi', 'iade-talebi-reddedildi', 'musteri-iptali', 'adres-duzeltildi'));
