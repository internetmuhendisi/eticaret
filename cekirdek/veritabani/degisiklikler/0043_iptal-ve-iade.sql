-- Geri dönüş: geri alınabilir. İki yeni tablo ve kart ödemesinin yeni alanı eski kodda okunmaz. Yeni geçmiş nedenleri (yönetici iptali, iade) yazıldıysa eski kodun denetimine dönmek o satırları reddeder: denetim yeni hâlinde bırakılır.
-- Kart 0235: iptal, tam ve kısmi iade; kartla ödemede kalem kalem iade (karar 0147).
CREATE TABLE "siparis_iadeleri" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"siparis_kimligi" uuid NOT NULL,
	"tur" text NOT NULL,
	"durum" text NOT NULL,
	"yontem" text NOT NULL,
	"tutar" bigint NOT NULL,
	"vergi_dokumu" jsonb NOT NULL,
	"kalemler" jsonb NOT NULL,
	"kargo_tutari" bigint NOT NULL,
	"stoga_konacak" boolean NOT NULL,
	"neden" text NOT NULL,
	"aciklama" text,
	"kim_turu" text NOT NULL,
	"kim_kimligi" uuid,
	"kim_adi" text,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"sonuc_zamani" timestamp with time zone,
	CONSTRAINT "siparis_iadeleri_tur" CHECK ("siparis_iadeleri"."tur" in ('iptal', 'iade')),
	CONSTRAINT "siparis_iadeleri_durum" CHECK ("siparis_iadeleri"."durum" in ('bekliyor', 'tamamlandi', 'basarisiz')),
	CONSTRAINT "siparis_iadeleri_yontem" CHECK ("siparis_iadeleri"."yontem" in ('kurulus', 'elle', 'yok')),
	CONSTRAINT "siparis_iadeleri_neden" CHECK ("siparis_iadeleri"."neden" in ('musteri-vazgecti', 'beklentiyi-karsilamadi', 'kusurlu-hasarli', 'yanlis-urun', 'stok-yok', 'diger')),
	CONSTRAINT "siparis_iadeleri_tutar" CHECK ("siparis_iadeleri"."tutar" >= 0 and "siparis_iadeleri"."kargo_tutari" >= 0 and ("siparis_iadeleri"."yontem" = 'yok') = ("siparis_iadeleri"."tutar" = 0)),
	CONSTRAINT "siparis_iadeleri_kim_dolu" CHECK (("siparis_iadeleri"."kim_turu" = 'sistem' and length("siparis_iadeleri"."kim_adi") > 0 and "siparis_iadeleri"."kim_kimligi" is null) or ("siparis_iadeleri"."kim_turu" in ('yonetici', 'musteri', 'sahip') and "siparis_iadeleri"."kim_kimligi" is not null and "siparis_iadeleri"."kim_adi" is null))
);
--> statement-breakpoint
CREATE TABLE "kart_iadeleri" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"iade_kimligi" uuid NOT NULL,
	"kart_odemesi_kimligi" uuid NOT NULL,
	"kalem" text NOT NULL,
	"islem" text,
	"tutar" bigint NOT NULL,
	"durum" text NOT NULL,
	"hata" text,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"sonuc_zamani" timestamp with time zone,
	"son_sorgu_zamani" timestamp with time zone,
	CONSTRAINT "kart_iadeleri_durum" CHECK ("kart_iadeleri"."durum" in ('gonderilecek', 'tamam', 'red', 'belirsiz')),
	CONSTRAINT "kart_iadeleri_tutar" CHECK ("kart_iadeleri"."tutar" > 0)
);
--> statement-breakpoint
ALTER TABLE "siparis_gecmisi" DROP CONSTRAINT "siparis_gecmisi_neden";--> statement-breakpoint
ALTER TABLE "kart_odemeleri" ADD COLUMN "kalem_islemleri" jsonb;--> statement-breakpoint
ALTER TABLE "siparis_iadeleri" ADD CONSTRAINT "siparis_iadeleri_siparis_kimligi_siparisler_kimlik_fk" FOREIGN KEY ("siparis_kimligi") REFERENCES "public"."siparisler"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kart_iadeleri" ADD CONSTRAINT "kart_iadeleri_iade_kimligi_siparis_iadeleri_kimlik_fk" FOREIGN KEY ("iade_kimligi") REFERENCES "public"."siparis_iadeleri"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kart_iadeleri" ADD CONSTRAINT "kart_iadeleri_kart_odemesi_kimligi_kart_odemeleri_kimlik_fk" FOREIGN KEY ("kart_odemesi_kimligi") REFERENCES "public"."kart_odemeleri"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "siparis_iadeleri_siparis" ON "siparis_iadeleri" USING btree ("siparis_kimligi","olusturma_zamani");--> statement-breakpoint
CREATE INDEX "siparis_iadeleri_bekleyen" ON "siparis_iadeleri" USING btree ("olusturma_zamani") WHERE "siparis_iadeleri"."durum" = 'bekliyor';--> statement-breakpoint
CREATE UNIQUE INDEX "siparis_iadeleri_tek_bekleyen" ON "siparis_iadeleri" USING btree ("siparis_kimligi") WHERE "siparis_iadeleri"."durum" = 'bekliyor';--> statement-breakpoint
CREATE UNIQUE INDEX "kart_iadeleri_kalem" ON "kart_iadeleri" USING btree ("iade_kimligi","kalem");--> statement-breakpoint
CREATE INDEX "kart_iadeleri_belirsiz" ON "kart_iadeleri" USING btree ("son_sorgu_zamani","olusturma_zamani") WHERE "kart_iadeleri"."durum" = 'belirsiz';--> statement-breakpoint
ALTER TABLE "siparis_gecmisi" ADD CONSTRAINT "siparis_gecmisi_neden" CHECK ("siparis_gecmisi"."neden" in ('olusturuldu', 'havale-suresi-doldu', 'havale-bildirildi', 'havale-onaylandi', 'hazirlamaya-alindi', 'kargoya-verildi', 'kargo-duzeltildi', 'teslim-edildi', 'yonetici-iptali', 'iade-yapildi'));