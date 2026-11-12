-- Geri dönüş: geri alınabilir. Eski kod yorum tablosunu ve görevlinin yorum izinlerini kullanmaz; hepsi yerinde kalır. Yeni tablo başka tabloya yazmaz.
-- Kart 0139: ürün yorumları (karar 0109). Görevli yorumları görür ve onaylar ya da reddeder (kullanıcı kararı).
CREATE TABLE "yorumlar" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"urun_kimligi" uuid NOT NULL,
	"musteri_kimligi" uuid,
	"puan" integer NOT NULL,
	"baslik" text,
	"metin" text NOT NULL,
	"ad" text NOT NULL,
	"durum" text NOT NULL,
	"dogrulanmis_alici" boolean DEFAULT false NOT NULL,
	"ana_sayfada" boolean DEFAULT false NOT NULL,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"guncellenme_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "yorumlar_puan" CHECK ("yorumlar"."puan" between 1 and 5),
	CONSTRAINT "yorumlar_durum" CHECK ("yorumlar"."durum" in ('onay-bekliyor', 'yayinda', 'reddedildi'))
);
--> statement-breakpoint
ALTER TABLE "yorumlar" ADD CONSTRAINT "yorumlar_urun_kimligi_urunler_kimlik_fk" FOREIGN KEY ("urun_kimligi") REFERENCES "public"."urunler"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yorumlar" ADD CONSTRAINT "yorumlar_musteri_kimligi_musteriler_kimlik_fk" FOREIGN KEY ("musteri_kimligi") REFERENCES "public"."musteriler"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "yorumlar_urun_durum_zaman" ON "yorumlar" USING btree ("urun_kimligi","durum","olusturma_zamani");--> statement-breakpoint
CREATE INDEX "yorumlar_ana_sayfa" ON "yorumlar" USING btree ("durum","ana_sayfada","olusturma_zamani");--> statement-breakpoint
CREATE INDEX "yorumlar_durum_zaman" ON "yorumlar" USING btree ("durum","olusturma_zamani");--> statement-breakpoint
CREATE UNIQUE INDEX "yorumlar_urun_musteri" ON "yorumlar" USING btree ("urun_kimligi","musteri_kimligi") WHERE "yorumlar"."musteri_kimligi" is not null;--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'yorum.gor' FROM "roller" WHERE "kod" = 'gorevli';--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'yorum.onayla' FROM "roller" WHERE "kod" = 'gorevli';
