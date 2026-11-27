-- Geri dönüş: geri alınabilir. Eski kod yeni tabloları ve yeni stok sebebini kullanmaz; tablolar boş kalır, stok geçmişindeki "excel-ice-aktarma" satırları eski denetimle çakışmaz (eski denetime dönmek önce o satırları ister).
-- Kart 0315: Excel ile toplu ürün işlemleri eklentisi (plan planlar/excel-ile-toplu-urun-islemleri.md): dışa aktarma, içe aktarma ve satırları; stok geçmişine "Excel ile içe aktarma" sebebi.
CREATE TABLE "excel_disa_aktarmalari" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"yonetici_kimligi" uuid NOT NULL,
	"durum" text NOT NULL,
	"kapsam" jsonb,
	"fiyat_sutunlari" boolean NOT NULL,
	"stok_sutunu" boolean NOT NULL,
	"urun_sayisi" integer DEFAULT 0 NOT NULL,
	"satir_sayisi" integer DEFAULT 0 NOT NULL,
	"degerler" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"dosya" "bytea",
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"bitis_zamani" timestamp with time zone,
	CONSTRAINT "excel_disa_aktarmalari_durum" CHECK ("excel_disa_aktarmalari"."durum" in ('hazirlaniyor', 'hazir', 'hatali')),
	CONSTRAINT "excel_disa_aktarmalari_dosya" CHECK (("excel_disa_aktarmalari"."durum" = 'hazir') = ("excel_disa_aktarmalari"."dosya" is not null))
);
--> statement-breakpoint
CREATE TABLE "excel_ice_aktarma_satirlari" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_kimligi" uuid NOT NULL,
	"satir_no" integer NOT NULL,
	"grup" text NOT NULL,
	"sonuc" text NOT NULL,
	"urun_kimligi" uuid,
	"birim_kimligi" uuid,
	"ad" text NOT NULL,
	"degisiklikler" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hatalar" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"gorulen" jsonb,
	"yazilacak" jsonb,
	"uygulandi" boolean DEFAULT false NOT NULL,
	"uygulama_hatasi" text,
	CONSTRAINT "excel_ice_aktarma_satirlari_sonuc" CHECK ("excel_ice_aktarma_satirlari"."sonuc" in ('ekle', 'degistir', 'ayni', 'hatali'))
);
--> statement-breakpoint
CREATE TABLE "excel_ice_aktarmalari" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"yonetici_kimligi" uuid NOT NULL,
	"durum" text NOT NULL,
	"dosya_adi" text NOT NULL,
	"dosya_boyutu" integer NOT NULL,
	"dosya" "bytea",
	"disa_aktarma_kimligi" uuid,
	"neden" text,
	"satir_sayisi" integer DEFAULT 0 NOT NULL,
	"fiyat_izni" boolean NOT NULL,
	"stok_izni" boolean NOT NULL,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"guncellenme_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"bitis_zamani" timestamp with time zone,
	CONSTRAINT "excel_ice_aktarmalari_durum" CHECK ("excel_ice_aktarmalari"."durum" in ('denetleniyor', 'onizleme', 'uygulaniyor', 'bitti', 'vazgecildi', 'okunamadi'))
);
--> statement-breakpoint
ALTER TABLE "stok_gecmisi" DROP CONSTRAINT "stok_gecmisi_sebep";--> statement-breakpoint
ALTER TABLE "excel_disa_aktarmalari" ADD CONSTRAINT "excel_disa_aktarmalari_yonetici_kimligi_yoneticiler_kimlik_fk" FOREIGN KEY ("yonetici_kimligi") REFERENCES "public"."yoneticiler"("kimlik") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "excel_ice_aktarma_satirlari" ADD CONSTRAINT "excel_ice_aktarma_satirlari_is_kimligi_excel_ice_aktarmalari_kimlik_fk" FOREIGN KEY ("is_kimligi") REFERENCES "public"."excel_ice_aktarmalari"("kimlik") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "excel_ice_aktarmalari" ADD CONSTRAINT "excel_ice_aktarmalari_yonetici_kimligi_yoneticiler_kimlik_fk" FOREIGN KEY ("yonetici_kimligi") REFERENCES "public"."yoneticiler"("kimlik") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "excel_disa_aktarmalari_yonetici" ON "excel_disa_aktarmalari" USING btree ("yonetici_kimligi","olusturma_zamani");--> statement-breakpoint
CREATE INDEX "excel_disa_aktarmalari_zaman" ON "excel_disa_aktarmalari" USING btree ("olusturma_zamani");--> statement-breakpoint
CREATE UNIQUE INDEX "excel_ice_aktarma_satirlari_sira" ON "excel_ice_aktarma_satirlari" USING btree ("is_kimligi","satir_no");--> statement-breakpoint
CREATE INDEX "excel_ice_aktarmalari_yonetici" ON "excel_ice_aktarmalari" USING btree ("yonetici_kimligi","olusturma_zamani");--> statement-breakpoint
CREATE INDEX "excel_ice_aktarmalari_zaman" ON "excel_ice_aktarmalari" USING btree ("olusturma_zamani");--> statement-breakpoint
ALTER TABLE "stok_gecmisi" ADD CONSTRAINT "stok_gecmisi_sebep" CHECK ("stok_gecmisi"."sebep" in ('sayim', 'yeni-mal', 'hasarli-kayip', 'iade-edilen', 'diger', 'siparis', 'siparis-iptali', 'siparis-iadesi', 'excel-ice-aktarma'));