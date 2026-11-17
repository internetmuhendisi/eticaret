-- Geri dönüş: geri alınabilir. Eski kod iki tabloyu kullanmaz; tablolar yerinde kalır. Yeni tablolar başka tabloya yazmaz.
-- Kart 0213: ödeme oturumları ve ödemede ayrılan stok (karar 0140).
CREATE TABLE "odeme_oturumlari" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"musteri_kimligi" uuid,
	"eposta" text NOT NULL,
	"teslimat" jsonb NOT NULL,
	"fatura" jsonb NOT NULL,
	"not" text,
	"kalemler" jsonb NOT NULL,
	"toplam" bigint NOT NULL,
	"para_birimi" text NOT NULL,
	"onaylar" jsonb NOT NULL,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"bitis_zamani" timestamp with time zone NOT NULL,
	CONSTRAINT "odeme_oturumlari_toplam" CHECK ("odeme_oturumlari"."toplam" >= 0),
	CONSTRAINT "odeme_oturumlari_bitis_sonra" CHECK ("odeme_oturumlari"."bitis_zamani" > "odeme_oturumlari"."olusturma_zamani")
);
--> statement-breakpoint
CREATE TABLE "stok_ayirmalari" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oturum_kimligi" uuid NOT NULL,
	"birim_kimligi" uuid NOT NULL,
	"adet" integer NOT NULL,
	"bitis_zamani" timestamp with time zone NOT NULL,
	CONSTRAINT "stok_ayirmalari_adet" CHECK ("stok_ayirmalari"."adet" > 0 and "stok_ayirmalari"."adet" <= 1000000000)
);
--> statement-breakpoint
ALTER TABLE "odeme_oturumlari" ADD CONSTRAINT "odeme_oturumlari_musteri_kimligi_musteriler_kimlik_fk" FOREIGN KEY ("musteri_kimligi") REFERENCES "public"."musteriler"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stok_ayirmalari" ADD CONSTRAINT "stok_ayirmalari_oturum_kimligi_odeme_oturumlari_kimlik_fk" FOREIGN KEY ("oturum_kimligi") REFERENCES "public"."odeme_oturumlari"("kimlik") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stok_ayirmalari" ADD CONSTRAINT "stok_ayirmalari_birim_kimligi_urun_birimleri_kimlik_fk" FOREIGN KEY ("birim_kimligi") REFERENCES "public"."urun_birimleri"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "odeme_oturumlari_bitis" ON "odeme_oturumlari" USING btree ("bitis_zamani");--> statement-breakpoint
CREATE INDEX "stok_ayirmalari_birim_bitis" ON "stok_ayirmalari" USING btree ("birim_kimligi","bitis_zamani");--> statement-breakpoint
CREATE INDEX "stok_ayirmalari_oturum" ON "stok_ayirmalari" USING btree ("oturum_kimligi");