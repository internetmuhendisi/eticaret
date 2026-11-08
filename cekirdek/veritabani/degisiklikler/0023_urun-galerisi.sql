-- Geri dönüş: geri alınabilir. Eski kod galeri ve boyut tablolarını ve iki tetikleyiciyi kullanmaz; hepsi yerinde kalır. Birimin görsel alanı eski kodda okunur ama yazılmaz; bağı dosyadan galeri öğesine geçer, alan bugün her yayında boştur. Geri dönülürse eski kod dolu alanı dosya kimliği sanıp okur, kullanmaz.
CREATE TABLE "dosya_boyutlari" (
	"kaynak_kimligi" uuid NOT NULL,
	"boyut" text NOT NULL,
	"dosya_kimligi" uuid NOT NULL,
	CONSTRAINT "dosya_boyutlari_kaynak_kimligi_boyut_pk" PRIMARY KEY("kaynak_kimligi","boyut")
);
--> statement-breakpoint
CREATE TABLE "urun_galerisi" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"urun_kimligi" uuid NOT NULL,
	"tur" text NOT NULL,
	"dosya_kimligi" uuid,
	"video_sitesi" text,
	"video_kimligi" text,
	"alternatif_metin" text NOT NULL,
	"sira" integer DEFAULT 0 NOT NULL,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"guncellenme_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"silinme_zamani" timestamp with time zone,
	CONSTRAINT "urun_galerisi_kimlik_urun" UNIQUE("kimlik","urun_kimligi"),
	CONSTRAINT "urun_galerisi_tur" CHECK ("urun_galerisi"."tur" in ('gorsel', 'video')),
	CONSTRAINT "urun_galerisi_video" CHECK (("urun_galerisi"."tur" = 'gorsel') = ("urun_galerisi"."dosya_kimligi" is not null)
        and ("urun_galerisi"."tur" = 'video') = ("urun_galerisi"."video_sitesi" is not null and "urun_galerisi"."video_kimligi" is not null)
        and ("urun_galerisi"."video_sitesi" is null or "urun_galerisi"."video_sitesi" in ('youtube', 'vimeo'))),
	CONSTRAINT "urun_galerisi_alternatif_metin" CHECK (length(trim("urun_galerisi"."alternatif_metin")) > 0)
);
--> statement-breakpoint
ALTER TABLE "urun_birimleri" DROP CONSTRAINT "urun_birimleri_gorsel_kimligi_dosyalar_kimlik_fk";
--> statement-breakpoint
ALTER TABLE "dosya_boyutlari" ADD CONSTRAINT "dosya_boyutlari_kaynak_kimligi_dosyalar_kimlik_fk" FOREIGN KEY ("kaynak_kimligi") REFERENCES "public"."dosyalar"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dosya_boyutlari" ADD CONSTRAINT "dosya_boyutlari_dosya_kimligi_dosyalar_kimlik_fk" FOREIGN KEY ("dosya_kimligi") REFERENCES "public"."dosyalar"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "urun_galerisi" ADD CONSTRAINT "urun_galerisi_urun_kimligi_urunler_kimlik_fk" FOREIGN KEY ("urun_kimligi") REFERENCES "public"."urunler"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "urun_galerisi" ADD CONSTRAINT "urun_galerisi_dosya_kimligi_dosyalar_kimlik_fk" FOREIGN KEY ("dosya_kimligi") REFERENCES "public"."dosyalar"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dosya_boyutlari_dosya" ON "dosya_boyutlari" USING btree ("dosya_kimligi");--> statement-breakpoint
CREATE INDEX "urun_galerisi_urun" ON "urun_galerisi" USING btree ("urun_kimligi","sira");--> statement-breakpoint
CREATE UNIQUE INDEX "urun_galerisi_dosya" ON "urun_galerisi" USING btree ("urun_kimligi","dosya_kimligi") WHERE "urun_galerisi"."silinme_zamani" is null and "urun_galerisi"."dosya_kimligi" is not null;--> statement-breakpoint
ALTER TABLE "urun_birimleri" ADD CONSTRAINT "urun_birimleri_gorsel" FOREIGN KEY ("gorsel_kimligi","urun_kimligi") REFERENCES "public"."urun_galerisi"("kimlik","urun_kimligi") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "urun_birimleri_gorsel_kimligi" ON "urun_birimleri" USING btree ("gorsel_kimligi");
--> statement-breakpoint
CREATE FUNCTION "urun_birimi_gorseli_denetle"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	-- Birimin seçtiği öğe silinmemiş bir görsel olmalı. Satır paylaşımlı kilitlenir: aynı anda öğeyi silen
	-- işlem bitene kadar beklenir, sonra silinmiş görülür.
	IF NEW."gorsel_kimligi" IS NOT NULL AND NOT EXISTS (
		SELECT 1 FROM "urun_galerisi"
		WHERE "kimlik" = NEW."gorsel_kimligi" AND "tur" = 'gorsel' AND "silinme_zamani" IS NULL
		FOR SHARE
	) THEN
		RAISE EXCEPTION 'Birimin görseli silinmemiş bir galeri görseli olmalı.' USING ERRCODE = 'check_violation';
	END IF;
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "urun_birimleri_gorsel_denetimi" BEFORE INSERT OR UPDATE OF "gorsel_kimligi" ON "urun_birimleri" FOR EACH ROW EXECUTE FUNCTION "urun_birimi_gorseli_denetle"();--> statement-breakpoint
CREATE FUNCTION "urun_galerisi_secimi_denetle"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	-- Silinmemiş bir birimin seçtiği öğe silinemez ve görsel olmaktan çıkamaz: önce birimin görseli boşaltılır.
	IF NEW."silinme_zamani" IS NOT NULL OR NEW."tur" <> 'gorsel' THEN
		-- Birimler yalnız READ COMMITTED işlemde öğenin kilidinden sonraki durumuyla okunur; daha yüksek
		-- yalıtımda işlemin baştaki görüntüsü okunur ve aynı anda kaydedilen seçim görünmez.
		IF current_setting('transaction_isolation') <> 'read committed' THEN
			RAISE EXCEPTION 'Galeri öğesi yalnız read committed işlemde silinir.' USING ERRCODE = 'serialization_failure';
		END IF;
		IF EXISTS (
			SELECT 1 FROM "urun_birimleri"
			WHERE "gorsel_kimligi" = OLD."kimlik" AND "silinme_zamani" IS NULL
		) THEN
			RAISE EXCEPTION 'Bir birimin seçtiği galeri öğesi silinemez.' USING ERRCODE = 'check_violation';
		END IF;
	END IF;
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "urun_galerisi_secim_denetimi" BEFORE UPDATE ON "urun_galerisi" FOR EACH ROW EXECUTE FUNCTION "urun_galerisi_secimi_denetle"();
