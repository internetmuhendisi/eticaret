-- Geri dönüş: geri alınabilir. Eski kod yeni tabloyu kullanmaz; tablo boş kalır ya da silinebilir (yalnız 24 saatlik dışa aktarma dosyaları kaybolur).
-- Kart 0316: siparişlerin dışa aktarması (plan planlar/siparisleri-disa-aktarma.md): yöneticinin istediği CSV dosyası ve durumu.
CREATE TABLE "siparis_disa_aktarmalari" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"yonetici_kimligi" uuid NOT NULL,
	"durum" text NOT NULL,
	"duzen" text NOT NULL,
	"kapsam" jsonb NOT NULL,
	"siparis_sayisi" integer DEFAULT 0 NOT NULL,
	"satir_sayisi" integer DEFAULT 0 NOT NULL,
	"dosya" "bytea",
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"bitis_zamani" timestamp with time zone,
	"indirme_zamani" timestamp with time zone,
	CONSTRAINT "siparis_disa_aktarmalari_durum" CHECK ("siparis_disa_aktarmalari"."durum" in ('hazirlaniyor', 'hazir', 'hatali')),
	CONSTRAINT "siparis_disa_aktarmalari_duzen" CHECK ("siparis_disa_aktarmalari"."duzen" in ('siparis', 'kalem')),
	CONSTRAINT "siparis_disa_aktarmalari_dosya" CHECK (("siparis_disa_aktarmalari"."durum" = 'hazir') = ("siparis_disa_aktarmalari"."dosya" is not null))
);
--> statement-breakpoint
ALTER TABLE "siparis_disa_aktarmalari" ADD CONSTRAINT "siparis_disa_aktarmalari_yonetici_kimligi_yoneticiler_kimlik_fk" FOREIGN KEY ("yonetici_kimligi") REFERENCES "public"."yoneticiler"("kimlik") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "siparis_disa_aktarmalari_yonetici" ON "siparis_disa_aktarmalari" USING btree ("yonetici_kimligi","olusturma_zamani");--> statement-breakpoint
CREATE INDEX "siparis_disa_aktarmalari_zaman" ON "siparis_disa_aktarmalari" USING btree ("olusturma_zamani");