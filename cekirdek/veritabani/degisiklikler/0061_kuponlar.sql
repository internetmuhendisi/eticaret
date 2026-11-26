-- Geri dönüş: geri alınabilir. Yeni tablolar, varsayılanlı yeni alanlar ve tetikleyici; eski kod tabloları ve alanları bilmez, kuponsuz siparişte yeni alanlar varsayılanlarıyla kalır. Geri dönüşte kuponlu sipariş varsa eski kod kupon satırını göstermez (tutarlar doğru kalır: ara toplam kupondan önce, toplam sonra).
-- Kart 0312: kuponlar, kapsamları ve kullanımları; siparişe, kaleme ve ödeme oturumuna kupon alanları; kullanılmış kuponun kodu, türü, değeri ve kapsamı değişmez (kupon_degismezlik).
CREATE TABLE "kupon_kapsami" (
	"kupon_kimligi" uuid NOT NULL,
	"urun_kimligi" uuid,
	"kategori_kimligi" uuid,
	"kayit_kimligi" uuid NOT NULL,
	CONSTRAINT "kupon_kapsami_kupon_kimligi_kayit_kimligi_pk" PRIMARY KEY("kupon_kimligi","kayit_kimligi"),
	CONSTRAINT "kupon_kapsami_tek" CHECK (("kupon_kapsami"."urun_kimligi" is null) <> ("kupon_kapsami"."kategori_kimligi" is null)
        and "kupon_kapsami"."kayit_kimligi" = coalesce("kupon_kapsami"."urun_kimligi", "kupon_kapsami"."kategori_kimligi"))
);
--> statement-breakpoint
CREATE TABLE "kupon_kullanimlari" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kupon_kimligi" uuid NOT NULL,
	"oturum_kimligi" uuid NOT NULL,
	"siparis_kimligi" uuid,
	"musteri_kimligi" uuid,
	"eposta" text,
	"bitis_zamani" timestamp with time zone NOT NULL,
	"serbest_zamani" timestamp with time zone,
	"zaman" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kuponlar" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kod" text NOT NULL,
	"ad" text,
	"tur" text NOT NULL,
	"deger" bigint NOT NULL,
	"kapsam" text NOT NULL,
	"en_az_tutar" bigint,
	"baslangic_zamani" timestamp with time zone,
	"bitis_zamani" timestamp with time zone,
	"toplam_sinir" integer,
	"kisi_basi_sinir" integer,
	"indirimde_gecmez" boolean DEFAULT false NOT NULL,
	"acik" boolean DEFAULT true NOT NULL,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"silinme_zamani" timestamp with time zone,
	CONSTRAINT "kuponlar_tur" CHECK ("kuponlar"."tur" in ('yuzde', 'tutar', 'ucretsiz-kargo')),
	CONSTRAINT "kuponlar_kapsam" CHECK ("kuponlar"."kapsam" in ('hepsi', 'urunler', 'kategoriler')),
	CONSTRAINT "kuponlar_deger" CHECK (("kuponlar"."tur" = 'yuzde' and "kuponlar"."deger" between 1 and 100)
        or ("kuponlar"."tur" = 'tutar' and "kuponlar"."deger" > 0)
        or ("kuponlar"."tur" = 'ucretsiz-kargo' and "kuponlar"."deger" = 0)),
	CONSTRAINT "kuponlar_sinirlar" CHECK (coalesce("kuponlar"."en_az_tutar", 0) >= 0 and coalesce("kuponlar"."toplam_sinir", 1) > 0
        and coalesce("kuponlar"."kisi_basi_sinir", 1) > 0),
	CONSTRAINT "kuponlar_sure" CHECK ("kuponlar"."baslangic_zamani" is null or "kuponlar"."bitis_zamani" is null
        or "kuponlar"."bitis_zamani" > "kuponlar"."baslangic_zamani")
);
--> statement-breakpoint
ALTER TABLE "siparis_kalemleri" DROP CONSTRAINT "siparis_kalemleri_tutarlar";--> statement-breakpoint
ALTER TABLE "odeme_oturumlari" ADD COLUMN "kupon_kodu" text;--> statement-breakpoint
ALTER TABLE "siparis_kalemleri" ADD COLUMN "indirim" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "siparisler" ADD COLUMN "kupon_kodu" text;--> statement-breakpoint
ALTER TABLE "siparisler" ADD COLUMN "kupon_turu" text;--> statement-breakpoint
ALTER TABLE "siparisler" ADD COLUMN "kupon_indirimi" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "siparisler" ADD COLUMN "kupon_kargo_indirimi" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "kupon_kapsami" ADD CONSTRAINT "kupon_kapsami_kupon_kimligi_kuponlar_kimlik_fk" FOREIGN KEY ("kupon_kimligi") REFERENCES "public"."kuponlar"("kimlik") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kupon_kapsami" ADD CONSTRAINT "kupon_kapsami_urun_kimligi_urunler_kimlik_fk" FOREIGN KEY ("urun_kimligi") REFERENCES "public"."urunler"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kupon_kapsami" ADD CONSTRAINT "kupon_kapsami_kategori_kimligi_kategoriler_kimlik_fk" FOREIGN KEY ("kategori_kimligi") REFERENCES "public"."kategoriler"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kupon_kullanimlari" ADD CONSTRAINT "kupon_kullanimlari_kupon_kimligi_kuponlar_kimlik_fk" FOREIGN KEY ("kupon_kimligi") REFERENCES "public"."kuponlar"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kupon_kullanimlari" ADD CONSTRAINT "kupon_kullanimlari_oturum_kimligi_odeme_oturumlari_kimlik_fk" FOREIGN KEY ("oturum_kimligi") REFERENCES "public"."odeme_oturumlari"("kimlik") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kupon_kullanimlari" ADD CONSTRAINT "kupon_kullanimlari_siparis_kimligi_siparisler_kimlik_fk" FOREIGN KEY ("siparis_kimligi") REFERENCES "public"."siparisler"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kupon_kullanimlari" ADD CONSTRAINT "kupon_kullanimlari_musteri_kimligi_musteriler_kimlik_fk" FOREIGN KEY ("musteri_kimligi") REFERENCES "public"."musteriler"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "kupon_kullanimlari_oturum" ON "kupon_kullanimlari" USING btree ("oturum_kimligi");--> statement-breakpoint
CREATE INDEX "kupon_kullanimlari_kupon" ON "kupon_kullanimlari" USING btree ("kupon_kimligi");--> statement-breakpoint
CREATE INDEX "kupon_kullanimlari_siparis" ON "kupon_kullanimlari" USING btree ("siparis_kimligi");--> statement-breakpoint
CREATE UNIQUE INDEX "kuponlar_kod" ON "kuponlar" USING btree (lower(translate("kod", 'İIı', 'iii'))) WHERE "kuponlar"."silinme_zamani" is null;--> statement-breakpoint
ALTER TABLE "siparis_kalemleri" ADD CONSTRAINT "siparis_kalemleri_tutarlar" CHECK ("siparis_kalemleri"."birim_tutari" >= 0 and "siparis_kalemleri"."tutar" >= 0 and "siparis_kalemleri"."vergisiz" >= 0 and "siparis_kalemleri"."vergi" >= 0
        and "siparis_kalemleri"."indirim" >= 0 and "siparis_kalemleri"."indirim" <= "siparis_kalemleri"."tutar");--> statement-breakpoint
ALTER TABLE "siparisler" ADD CONSTRAINT "siparisler_kupon" CHECK (("siparisler"."kupon_kodu" is null) = ("siparisler"."kupon_turu" is null)
        and ("siparisler"."kupon_turu" is null or "siparisler"."kupon_turu" in ('yuzde', 'tutar', 'ucretsiz-kargo'))
        and "siparisler"."kupon_indirimi" >= 0 and "siparisler"."kupon_indirimi" <= "siparisler"."ara_toplam"
        and ("siparisler"."kupon_kodu" is not null or "siparisler"."kupon_indirimi" = 0)
        and "siparisler"."kupon_kargo_indirimi" >= 0
        and ("siparisler"."kupon_kargo_indirimi" = 0
          or ("siparisler"."kupon_turu" = 'ucretsiz-kargo' and "siparisler"."kargo_turu" = 'ucretsiz')));--> statement-breakpoint
CREATE FUNCTION kupon_kullanildi_mi(kupon uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  select exists (
    select 1 from kupon_kullanimlari
    where kupon_kimligi = kupon and (siparis_kimligi is not null or bitis_zamani > now())
  )
$$;--> statement-breakpoint
CREATE FUNCTION kupon_degismezlik() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.kod, NEW.tur, NEW.deger, NEW.kapsam, NEW.indirimde_gecmez) IS DISTINCT FROM
     (OLD.kod, OLD.tur, OLD.deger, OLD.kapsam, OLD.indirimde_gecmez)
     AND kupon_kullanildi_mi(OLD.kimlik) THEN
    RAISE EXCEPTION 'kullanılmış kuponun kodu, türü, değeri ve kapsamı değişmez' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER kupon_degismezlik BEFORE UPDATE ON kuponlar FOR EACH ROW EXECUTE FUNCTION kupon_degismezlik();--> statement-breakpoint
CREATE FUNCTION kupon_kapsami_degismezlik() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF kupon_kullanildi_mi(coalesce(NEW.kupon_kimligi, OLD.kupon_kimligi))
     AND EXISTS (SELECT 1 FROM kuponlar WHERE kimlik = coalesce(NEW.kupon_kimligi, OLD.kupon_kimligi)) THEN
    RAISE EXCEPTION 'kullanılmış kuponun kapsamı değişmez' USING ERRCODE = 'check_violation';
  END IF;
  RETURN coalesce(NEW, OLD);
END;
$$;--> statement-breakpoint
CREATE TRIGGER kupon_kapsami_degismezlik BEFORE INSERT OR UPDATE OR DELETE ON kupon_kapsami FOR EACH ROW EXECUTE FUNCTION kupon_kapsami_degismezlik();
