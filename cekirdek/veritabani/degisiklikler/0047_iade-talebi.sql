-- Geri dönüş: geri alınabilir. Yeni tablo ve iade tablosunun iki yeni alanı eski kodda okunmaz. Yeni geçmiş nedenleri (iade talebi, müşteri iptali) ya da "beden-uymadi" nedeni yazıldıysa eski kodun denetimine dönmek o satırları reddeder: denetimler yeni hâlinde bırakılır.
-- Kart 0239: müşterinin iade talebi ve kendi iptali (karar 0151).
CREATE TABLE "siparis_iade_talepleri" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"siparis_kimligi" uuid NOT NULL,
	"durum" text NOT NULL,
	"kalemler" jsonb NOT NULL,
	"neden" text NOT NULL,
	"aciklama" text,
	"ret_aciklamasi" text,
	"kim_turu" text NOT NULL,
	"kim_kimligi" uuid,
	"kim_adi" text,
	"karar_veren_kimligi" uuid,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"karar_zamani" timestamp with time zone,
	CONSTRAINT "siparis_iade_talepleri_durum" CHECK ("siparis_iade_talepleri"."durum" in ('bekliyor', 'onaylandi', 'reddedildi')),
	CONSTRAINT "siparis_iade_talepleri_neden" CHECK ("siparis_iade_talepleri"."neden" in ('beklentiyi-karsilamadi', 'kusurlu-hasarli', 'yanlis-urun', 'beden-uymadi', 'diger')),
	CONSTRAINT "siparis_iade_talepleri_karar" CHECK (("siparis_iade_talepleri"."durum" = 'bekliyor') = ("siparis_iade_talepleri"."karar_zamani" is null) and ("siparis_iade_talepleri"."durum" = 'bekliyor') = ("siparis_iade_talepleri"."karar_veren_kimligi" is null) and ("siparis_iade_talepleri"."durum" = 'reddedildi') = (coalesce(length("siparis_iade_talepleri"."ret_aciklamasi"), 0) > 0)),
	CONSTRAINT "siparis_iade_talepleri_kim_dolu" CHECK (("siparis_iade_talepleri"."kim_turu" = 'sistem' and length("siparis_iade_talepleri"."kim_adi") > 0 and "siparis_iade_talepleri"."kim_kimligi" is null) or ("siparis_iade_talepleri"."kim_turu" = 'musteri' and "siparis_iade_talepleri"."kim_kimligi" is not null and "siparis_iade_talepleri"."kim_adi" is null))
);
--> statement-breakpoint
ALTER TABLE "siparis_gecmisi" DROP CONSTRAINT "siparis_gecmisi_neden";--> statement-breakpoint
ALTER TABLE "siparis_iadeleri" DROP CONSTRAINT "siparis_iadeleri_neden";--> statement-breakpoint
ALTER TABLE "siparis_iadeleri" ADD COLUMN "kaynak" text DEFAULT 'yonetici' NOT NULL;--> statement-breakpoint
ALTER TABLE "siparis_iadeleri" ADD COLUMN "talep_kimligi" uuid;--> statement-breakpoint
ALTER TABLE "siparis_iade_talepleri" ADD CONSTRAINT "siparis_iade_talepleri_siparis_kimligi_siparisler_kimlik_fk" FOREIGN KEY ("siparis_kimligi") REFERENCES "public"."siparisler"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "siparis_iade_talepleri_siparis" ON "siparis_iade_talepleri" USING btree ("siparis_kimligi","olusturma_zamani");--> statement-breakpoint
CREATE INDEX "siparis_iade_talepleri_bekleyen" ON "siparis_iade_talepleri" USING btree ("olusturma_zamani") WHERE "siparis_iade_talepleri"."durum" = 'bekliyor';--> statement-breakpoint
CREATE UNIQUE INDEX "siparis_iade_talepleri_tek_bekleyen" ON "siparis_iade_talepleri" USING btree ("siparis_kimligi") WHERE "siparis_iade_talepleri"."durum" = 'bekliyor';--> statement-breakpoint
ALTER TABLE "siparis_iadeleri" ADD CONSTRAINT "siparis_iadeleri_talep_kimligi_siparis_iade_talepleri_kimlik_fk" FOREIGN KEY ("talep_kimligi") REFERENCES "public"."siparis_iade_talepleri"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "siparis_iadeleri_tek_talep" ON "siparis_iadeleri" USING btree ("talep_kimligi") WHERE "siparis_iadeleri"."talep_kimligi" is not null and "siparis_iadeleri"."durum" <> 'basarisiz';--> statement-breakpoint
ALTER TABLE "siparis_gecmisi" ADD CONSTRAINT "siparis_gecmisi_neden" CHECK ("siparis_gecmisi"."neden" in ('olusturuldu', 'panelden-olusturuldu', 'havale-suresi-doldu', 'havale-bildirildi', 'havale-onaylandi', 'hazirlamaya-alindi', 'kargoya-verildi', 'kargo-duzeltildi', 'teslim-edildi', 'yonetici-iptali', 'iade-yapildi', 'iade-talebi-alindi', 'iade-talebi-onaylandi', 'iade-talebi-reddedildi', 'musteri-iptali'));--> statement-breakpoint
ALTER TABLE "siparis_iadeleri" ADD CONSTRAINT "siparis_iadeleri_kaynak" CHECK ("siparis_iadeleri"."kaynak" in ('yonetici', 'musteri'));--> statement-breakpoint
ALTER TABLE "siparis_iadeleri" ADD CONSTRAINT "siparis_iadeleri_talep" CHECK ("siparis_iadeleri"."talep_kimligi" is null or ("siparis_iadeleri"."tur" = 'iade' and "siparis_iadeleri"."kaynak" = 'yonetici'));--> statement-breakpoint
ALTER TABLE "siparis_iadeleri" ADD CONSTRAINT "siparis_iadeleri_neden" CHECK ("siparis_iadeleri"."neden" in ('musteri-vazgecti', 'beklentiyi-karsilamadi', 'kusurlu-hasarli', 'yanlis-urun', 'beden-uymadi', 'stok-yok', 'diger'));