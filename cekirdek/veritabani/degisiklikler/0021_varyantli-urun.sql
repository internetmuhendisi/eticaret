-- Geri dönüş: geri alınabilir. Eski kod seçenek tablolarını ve birimin birleşim ile görsel alanlarını kullanmaz; hepsi yerinde kalır. Var olan birimler boş birleşim anahtarı alır: servis ürün başına tek birim yazdığı için birleşim indeksi çakışmasız kurulur. Eski kodun yazdığı yeni birim de boş anahtar alır. Geri dönülürse eski kod varyantlı ürünün ilk birleşimini basit ürünün birimi sayar ve ürün değişikliğinde onu değiştirir; bugün hiçbir yayında ürün yoktur.
CREATE TABLE "urun_birimi_degerleri" (
	"birim_kimligi" uuid NOT NULL,
	"deger_kimligi" uuid NOT NULL,
	CONSTRAINT "urun_birimi_degerleri_birim_kimligi_deger_kimligi_pk" PRIMARY KEY("birim_kimligi","deger_kimligi")
);
--> statement-breakpoint
CREATE TABLE "urun_secenek_degerleri" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"secenek_kimligi" uuid NOT NULL,
	"ad" text NOT NULL,
	"sira" integer DEFAULT 0 NOT NULL,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"guncellenme_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"silinme_zamani" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "urun_secenekleri" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"urun_kimligi" uuid NOT NULL,
	"ad" text NOT NULL,
	"sira" integer DEFAULT 0 NOT NULL,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"guncellenme_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"silinme_zamani" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "urun_birimleri" ADD COLUMN "birlesim" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "urun_birimleri" ADD COLUMN "gorsel_kimligi" uuid;--> statement-breakpoint
ALTER TABLE "urun_birimi_degerleri" ADD CONSTRAINT "urun_birimi_degerleri_birim_kimligi_urun_birimleri_kimlik_fk" FOREIGN KEY ("birim_kimligi") REFERENCES "public"."urun_birimleri"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "urun_birimi_degerleri" ADD CONSTRAINT "urun_birimi_degerleri_deger_kimligi_urun_secenek_degerleri_kimlik_fk" FOREIGN KEY ("deger_kimligi") REFERENCES "public"."urun_secenek_degerleri"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "urun_secenek_degerleri" ADD CONSTRAINT "urun_secenek_degerleri_secenek_kimligi_urun_secenekleri_kimlik_fk" FOREIGN KEY ("secenek_kimligi") REFERENCES "public"."urun_secenekleri"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "urun_secenekleri" ADD CONSTRAINT "urun_secenekleri_urun_kimligi_urunler_kimlik_fk" FOREIGN KEY ("urun_kimligi") REFERENCES "public"."urunler"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "urun_birimi_degerleri_deger" ON "urun_birimi_degerleri" USING btree ("deger_kimligi");--> statement-breakpoint
CREATE UNIQUE INDEX "urun_secenek_degerleri_ad" ON "urun_secenek_degerleri" USING btree ("secenek_kimligi",lower(translate("ad", 'İIı', 'iii'))) WHERE "urun_secenek_degerleri"."silinme_zamani" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "urun_secenekleri_ad" ON "urun_secenekleri" USING btree ("urun_kimligi",lower(translate("ad", 'İIı', 'iii'))) WHERE "urun_secenekleri"."silinme_zamani" is null;--> statement-breakpoint
ALTER TABLE "urun_birimleri" ADD CONSTRAINT "urun_birimleri_gorsel_kimligi_dosyalar_kimlik_fk" FOREIGN KEY ("gorsel_kimligi") REFERENCES "public"."dosyalar"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "urun_birimleri_birlesim" ON "urun_birimleri" USING btree ("urun_kimligi","birlesim") WHERE "urun_birimleri"."silinme_zamani" is null;