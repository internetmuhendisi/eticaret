-- Geri dönüş: geri alınabilir. Eski kod kart ödemeleri tablosunu ve siparişin tahsilat alanını kullanmaz; yerinde kalır. Kartla ödenmiş sipariş varsa eski kodun genişleyen durum ve yöntem denetimlerine dönmesi o satırları reddeder: denetimler yeni hâlinde bırakılır.
-- Kart 0215: kartla ödeme eklentisinin kart ödemeleri, siparişin tahsilat alanı, "hazırlanıyor" durumu ve kart yöntemi (karar 0142).
CREATE TABLE "kart_odemeleri" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oturum_kimligi" uuid NOT NULL,
	"belirtec" text NOT NULL,
	"odeme_kimligi" text,
	"durum" text NOT NULL,
	"ortam" text NOT NULL,
	"tutar" bigint NOT NULL,
	"para_birimi" text NOT NULL,
	"odenen" bigint,
	"taksit" integer,
	"siparis_kimligi" uuid,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"sonuc_zamani" timestamp with time zone,
	CONSTRAINT "kart_odemeleri_durum" CHECK ("kart_odemeleri"."durum" in ('baslatildi', 'odendi', 'basarisiz', 'iptal-edildi')),
	CONSTRAINT "kart_odemeleri_ortam" CHECK ("kart_odemeleri"."ortam" in ('deneme', 'canli')),
	CONSTRAINT "kart_odemeleri_sonuc_alanlari" CHECK (("kart_odemeleri"."durum" = 'odendi' and "kart_odemeleri"."siparis_kimligi" is not null and "kart_odemeleri"."odeme_kimligi" is not null and "kart_odemeleri"."odenen" is not null and "kart_odemeleri"."taksit" is not null and "kart_odemeleri"."sonuc_zamani" is not null) or ("kart_odemeleri"."durum" = 'baslatildi' and "kart_odemeleri"."siparis_kimligi" is null and "kart_odemeleri"."sonuc_zamani" is null) or ("kart_odemeleri"."durum" in ('basarisiz', 'iptal-edildi') and "kart_odemeleri"."siparis_kimligi" is null and "kart_odemeleri"."sonuc_zamani" is not null)),
	CONSTRAINT "kart_odemeleri_tutarlar" CHECK ("kart_odemeleri"."tutar" > 0 and ("kart_odemeleri"."odenen" is null or "kart_odemeleri"."odenen" >= "kart_odemeleri"."tutar") and ("kart_odemeleri"."taksit" is null or "kart_odemeleri"."taksit" between 1 and 12))
);
--> statement-breakpoint
ALTER TABLE "siparisler" DROP CONSTRAINT "siparisler_durum";--> statement-breakpoint
ALTER TABLE "siparisler" DROP CONSTRAINT "siparisler_odeme_yontemi";--> statement-breakpoint
ALTER TABLE "siparisler" ADD COLUMN "tahsilat" jsonb;--> statement-breakpoint
ALTER TABLE "kart_odemeleri" ADD CONSTRAINT "kart_odemeleri_oturum_kimligi_odeme_oturumlari_kimlik_fk" FOREIGN KEY ("oturum_kimligi") REFERENCES "public"."odeme_oturumlari"("kimlik") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kart_odemeleri" ADD CONSTRAINT "kart_odemeleri_siparis_kimligi_siparisler_kimlik_fk" FOREIGN KEY ("siparis_kimligi") REFERENCES "public"."siparisler"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "kart_odemeleri_belirtec" ON "kart_odemeleri" USING btree ("belirtec");--> statement-breakpoint
CREATE UNIQUE INDEX "kart_odemeleri_oturum" ON "kart_odemeleri" USING btree ("oturum_kimligi");--> statement-breakpoint
CREATE INDEX "kart_odemeleri_bekleyen" ON "kart_odemeleri" USING btree ("olusturma_zamani") WHERE "kart_odemeleri"."durum" = 'baslatildi';--> statement-breakpoint
CREATE INDEX "kart_odemeleri_sonuc" ON "kart_odemeleri" USING btree ("sonuc_zamani");--> statement-breakpoint
ALTER TABLE "siparisler" ADD CONSTRAINT "siparisler_tahsilat" CHECK ("siparisler"."tahsilat" is null or "siparisler"."odeme_yontemi" = 'kart');--> statement-breakpoint
ALTER TABLE "siparisler" ADD CONSTRAINT "siparisler_durum" CHECK ("siparisler"."durum" in ('odeme-bekleniyor', 'hazirlaniyor', 'iptal'));--> statement-breakpoint
ALTER TABLE "siparisler" ADD CONSTRAINT "siparisler_odeme_yontemi" CHECK (("siparisler"."odeme_yontemi" = 'havale' and "siparisler"."kapida_secenegi" is null and "siparisler"."odeme_son_zamani" is not null) or ("siparisler"."odeme_yontemi" = 'kapida-odeme' and "siparisler"."kapida_secenegi" in ('nakit', 'kart') and "siparisler"."odeme_son_zamani" is null) or ("siparisler"."odeme_yontemi" = 'kart' and "siparisler"."kapida_secenegi" is null and "siparisler"."odeme_son_zamani" is null and "siparisler"."tahsilat" is not null));