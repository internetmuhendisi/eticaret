-- Geri dönüş: geri alınabilir. Yeni alanlar ve not tablosu eski kodda okunmaz. Yeni durumlar (kargoda, teslim edildi) ya da nedenler yazıldıysa eski kodun denetimlerine dönmek o satırları reddeder: denetimler yeni hâlinde bırakılır. Görevlinin iki yeni izni eski kodda kullanılmaz, kalabilir.
-- Kart 0234: sipariş durumları ve geçişleri, panelin işlemleri, kargo bilgisi, notlar ve kişisel verinin saklanması (karar 0145).
CREATE TABLE "siparis_notlari" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"siparis_kimligi" uuid NOT NULL,
	"zaman" timestamp with time zone DEFAULT now() NOT NULL,
	"tur" text NOT NULL,
	"metin" text NOT NULL,
	"kim_turu" text NOT NULL,
	"kim_kimligi" uuid,
	"kim_adi" text,
	CONSTRAINT "siparis_notlari_tur" CHECK ("siparis_notlari"."tur" in ('ic', 'musteri')),
	CONSTRAINT "siparis_notlari_metin" CHECK (length("siparis_notlari"."metin") between 1 and 1000),
	CONSTRAINT "siparis_notlari_kim_dolu" CHECK (("siparis_notlari"."kim_turu" = 'sistem' and length("siparis_notlari"."kim_adi") > 0 and "siparis_notlari"."kim_kimligi" is null) or ("siparis_notlari"."kim_turu" in ('yonetici', 'musteri', 'sahip') and "siparis_notlari"."kim_kimligi" is not null and "siparis_notlari"."kim_adi" is null))
);
--> statement-breakpoint
ALTER TABLE "siparis_gecmisi" DROP CONSTRAINT "siparis_gecmisi_neden";--> statement-breakpoint
ALTER TABLE "siparis_gecmisi" DROP CONSTRAINT "siparis_gecmisi_durum";--> statement-breakpoint
ALTER TABLE "siparisler" DROP CONSTRAINT "siparisler_durum";--> statement-breakpoint
ALTER TABLE "siparisler" ADD COLUMN "odeme_zamani" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "siparisler" ADD COLUMN "kargo_firmasi" text;--> statement-breakpoint
ALTER TABLE "siparisler" ADD COLUMN "takip_numarasi" text;--> statement-breakpoint
ALTER TABLE "siparisler" ADD COLUMN "takip_adresi" text;--> statement-breakpoint
ALTER TABLE "siparisler" ADD COLUMN "kargo_zamani" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "siparisler" ADD COLUMN "teslim_zamani" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "siparisler" ADD COLUMN "kisisel_veri_silinme_zamani" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "siparis_notlari" ADD CONSTRAINT "siparis_notlari_siparis_kimligi_siparisler_kimlik_fk" FOREIGN KEY ("siparis_kimligi") REFERENCES "public"."siparisler"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "siparis_notlari_siparis" ON "siparis_notlari" USING btree ("siparis_kimligi","zaman");--> statement-breakpoint
CREATE INDEX "siparisler_durum_zaman" ON "siparisler" USING btree ("durum","olusturma_zamani");--> statement-breakpoint
CREATE INDEX "siparisler_kisisel_veri" ON "siparisler" USING btree ("olusturma_zamani") WHERE "siparisler"."kisisel_veri_silinme_zamani" is null;--> statement-breakpoint
ALTER TABLE "siparis_gecmisi" ADD CONSTRAINT "siparis_gecmisi_neden" CHECK ("siparis_gecmisi"."neden" in ('olusturuldu', 'havale-suresi-doldu', 'havale-bildirildi', 'havale-onaylandi', 'hazirlamaya-alindi', 'kargoya-verildi', 'kargo-duzeltildi', 'teslim-edildi'));--> statement-breakpoint
ALTER TABLE "siparis_gecmisi" ADD CONSTRAINT "siparis_gecmisi_durum" CHECK ("siparis_gecmisi"."sonraki_durum" in ('odeme-bekleniyor', 'hazirlaniyor', 'kargoda', 'teslim-edildi', 'kismi-iade', 'iade-edildi', 'iptal') and ("siparis_gecmisi"."onceki_durum" is null or "siparis_gecmisi"."onceki_durum" in ('odeme-bekleniyor', 'hazirlaniyor', 'kargoda', 'teslim-edildi', 'kismi-iade', 'iade-edildi', 'iptal')));--> statement-breakpoint
ALTER TABLE "siparisler" ADD CONSTRAINT "siparisler_kargo_bilgisi" CHECK (("siparisler"."kargo_firmasi" is null) = ("siparisler"."kargo_zamani" is null) and ("siparisler"."kargo_firmasi" is not null or ("siparisler"."takip_numarasi" is null and "siparisler"."takip_adresi" is null)) and ("siparisler"."durum" not in ('kargoda', 'teslim-edildi') or "siparisler"."kargo_firmasi" is not null));--> statement-breakpoint
ALTER TABLE "siparisler" ADD CONSTRAINT "siparisler_teslim" CHECK (("siparisler"."teslim_zamani" is null) = ("siparisler"."durum" in ('odeme-bekleniyor', 'hazirlaniyor', 'kargoda', 'iptal')));--> statement-breakpoint
ALTER TABLE "siparisler" ADD CONSTRAINT "siparisler_durum" CHECK ("siparisler"."durum" in ('odeme-bekleniyor', 'hazirlaniyor', 'kargoda', 'teslim-edildi', 'kismi-iade', 'iade-edildi', 'iptal'));--> statement-breakpoint
UPDATE "siparisler" SET "odeme_zamani" = "olusturma_zamani" WHERE "odeme_yontemi" = 'kart' AND "odeme_zamani" IS NULL;--> statement-breakpoint
CREATE FUNCTION "siparis_durum_gecisi"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- cekirdek/kayitlar/siparis.ts: siparisDurumTanimlari (gecis). Testi: cekirdek/moduller/siparis/testler/durum.test.ts.
  IF NEW."durum" IS DISTINCT FROM OLD."durum" AND (OLD."durum", NEW."durum") NOT IN (
    ('odeme-bekleniyor', 'hazirlaniyor'), ('odeme-bekleniyor', 'iptal'),
    ('hazirlaniyor', 'kargoda'), ('hazirlaniyor', 'iptal'),
    ('kargoda', 'teslim-edildi'),
    ('teslim-edildi', 'kismi-iade'), ('teslim-edildi', 'iade-edildi'),
    ('kismi-iade', 'iade-edildi')
  ) THEN
    RAISE EXCEPTION 'siparis durumu % durumundan % durumuna gecemez', OLD."durum", NEW."durum" USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "siparis_durum_gecisi" BEFORE UPDATE OF "durum" ON "siparisler" FOR EACH ROW EXECUTE FUNCTION "siparis_durum_gecisi"();--> statement-breakpoint
CREATE FUNCTION "siparis_notlari_degistirilemez"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'siparis notu sonradan degistirilemez' USING ERRCODE = 'restrict_violation';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "siparis_notlari_degistirilemez" BEFORE UPDATE OR DELETE OR TRUNCATE ON "siparis_notlari" FOR EACH STATEMENT EXECUTE FUNCTION "siparis_notlari_degistirilemez"();--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'siparis.gor' FROM "roller" WHERE "kod" = 'gorevli';--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'siparis.yonet' FROM "roller" WHERE "kod" = 'gorevli';