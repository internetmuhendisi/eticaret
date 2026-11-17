-- Geri dönüş: geri alınabilir. Eski kod sipariş tablolarını, sipariş numarası sırasını, geçmişin değiştirilemezlik tetikleyicisini ve görevlinin ödeme yöntemi iznini kullanmaz; hepsi yerinde kalır, silinmez.
-- Kart 0214: siparişler, kalemleri, geçmişi ve havale bildirimleri (karar 0141). Görevli ödeme yöntemlerini ve banka hesaplarını görür, değiştiremez (kullanıcı kararı).
CREATE SEQUENCE "public"."siparis_numarasi" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "havale_bildirimleri" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"siparis_kimligi" uuid NOT NULL,
	"gonderen" text NOT NULL,
	"banka" text NOT NULL,
	"iban" text NOT NULL,
	"tutar" bigint NOT NULL,
	"odeme_tarihi" text NOT NULL,
	"not" text,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "havale_bildirimleri_tutar" CHECK ("havale_bildirimleri"."tutar" > 0)
);
--> statement-breakpoint
CREATE TABLE "siparis_gecmisi" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"siparis_kimligi" uuid NOT NULL,
	"zaman" timestamp with time zone DEFAULT now() NOT NULL,
	"onceki_durum" text,
	"sonraki_durum" text NOT NULL,
	"neden" text NOT NULL,
	"kim_turu" text NOT NULL,
	"kim_kimligi" uuid,
	"kim_adi" text,
	CONSTRAINT "siparis_gecmisi_neden" CHECK ("siparis_gecmisi"."neden" in ('olusturuldu', 'havale-suresi-doldu', 'havale-bildirildi')),
	CONSTRAINT "siparis_gecmisi_durum" CHECK ("siparis_gecmisi"."sonraki_durum" in ('odeme-bekleniyor', 'iptal') and ("siparis_gecmisi"."onceki_durum" is null or "siparis_gecmisi"."onceki_durum" in ('odeme-bekleniyor', 'iptal'))),
	CONSTRAINT "siparis_gecmisi_kim_dolu" CHECK (("siparis_gecmisi"."kim_turu" = 'sistem' and length("siparis_gecmisi"."kim_adi") > 0 and "siparis_gecmisi"."kim_kimligi" is null) or ("siparis_gecmisi"."kim_turu" in ('yonetici', 'musteri', 'sahip') and "siparis_gecmisi"."kim_kimligi" is not null and "siparis_gecmisi"."kim_adi" is null))
);
--> statement-breakpoint
CREATE TABLE "siparis_kalemleri" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"siparis_kimligi" uuid NOT NULL,
	"sira" integer NOT NULL,
	"birim_kimligi" uuid NOT NULL,
	"urun_kimligi" uuid NOT NULL,
	"urun_adi" text NOT NULL,
	"secim" jsonb NOT NULL,
	"stok_kodu" text,
	"adet" integer NOT NULL,
	"birim_tutari" bigint NOT NULL,
	"tutar" bigint NOT NULL,
	"vergisiz" bigint NOT NULL,
	"vergi" bigint NOT NULL,
	"vergi_oranlari" jsonb NOT NULL,
	CONSTRAINT "siparis_kalemleri_adet" CHECK ("siparis_kalemleri"."adet" > 0),
	CONSTRAINT "siparis_kalemleri_tutarlar" CHECK ("siparis_kalemleri"."birim_tutari" >= 0 and "siparis_kalemleri"."tutar" >= 0 and "siparis_kalemleri"."vergisiz" >= 0 and "siparis_kalemleri"."vergi" >= 0)
);
--> statement-breakpoint
CREATE TABLE "siparisler" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numara" text NOT NULL,
	"oturum_kimligi" uuid NOT NULL,
	"musteri_kimligi" uuid,
	"eposta" text NOT NULL,
	"teslimat" jsonb NOT NULL,
	"fatura" jsonb NOT NULL,
	"not" text,
	"onaylar" jsonb NOT NULL,
	"odeme_yontemi" text NOT NULL,
	"kapida_secenegi" text,
	"durum" text NOT NULL,
	"para_birimi" text NOT NULL,
	"gosterim" text NOT NULL,
	"ara_toplam" bigint NOT NULL,
	"kargo_turu" text NOT NULL,
	"kargo_tutari" bigint NOT NULL,
	"vergi_toplami" bigint NOT NULL,
	"toplam" bigint NOT NULL,
	"vergi_dokumu" jsonb NOT NULL,
	"odeme_son_zamani" timestamp with time zone,
	"erisim_ozeti" text NOT NULL,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "siparisler_durum" CHECK ("siparisler"."durum" in ('odeme-bekleniyor', 'iptal')),
	CONSTRAINT "siparisler_odeme_yontemi" CHECK (("siparisler"."odeme_yontemi" = 'havale' and "siparisler"."kapida_secenegi" is null and "siparisler"."odeme_son_zamani" is not null) or ("siparisler"."odeme_yontemi" = 'kapida-odeme' and "siparisler"."kapida_secenegi" in ('nakit', 'kart') and "siparisler"."odeme_son_zamani" is null)),
	CONSTRAINT "siparisler_kargo" CHECK (("siparisler"."kargo_turu" = 'ucretli' and "siparisler"."kargo_tutari" > 0) or ("siparisler"."kargo_turu" in ('yok', 'ucretsiz') and "siparisler"."kargo_tutari" = 0)),
	CONSTRAINT "siparisler_gosterim" CHECK ("siparisler"."gosterim" in ('vergi-dahil', 'vergi-haric', 'yok')),
	CONSTRAINT "siparisler_tutarlar" CHECK ("siparisler"."ara_toplam" >= 0 and "siparisler"."kargo_tutari" >= 0 and "siparisler"."vergi_toplami" >= 0 and "siparisler"."toplam" >= 0)
);
--> statement-breakpoint
ALTER TABLE "havale_bildirimleri" ADD CONSTRAINT "havale_bildirimleri_siparis_kimligi_siparisler_kimlik_fk" FOREIGN KEY ("siparis_kimligi") REFERENCES "public"."siparisler"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siparis_gecmisi" ADD CONSTRAINT "siparis_gecmisi_siparis_kimligi_siparisler_kimlik_fk" FOREIGN KEY ("siparis_kimligi") REFERENCES "public"."siparisler"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siparis_kalemleri" ADD CONSTRAINT "siparis_kalemleri_siparis_kimligi_siparisler_kimlik_fk" FOREIGN KEY ("siparis_kimligi") REFERENCES "public"."siparisler"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siparis_kalemleri" ADD CONSTRAINT "siparis_kalemleri_birim_kimligi_urun_birimleri_kimlik_fk" FOREIGN KEY ("birim_kimligi") REFERENCES "public"."urun_birimleri"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siparisler" ADD CONSTRAINT "siparisler_oturum_kimligi_odeme_oturumlari_kimlik_fk" FOREIGN KEY ("oturum_kimligi") REFERENCES "public"."odeme_oturumlari"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siparisler" ADD CONSTRAINT "siparisler_musteri_kimligi_musteriler_kimlik_fk" FOREIGN KEY ("musteri_kimligi") REFERENCES "public"."musteriler"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "havale_bildirimleri_siparis" ON "havale_bildirimleri" USING btree ("siparis_kimligi");--> statement-breakpoint
CREATE INDEX "siparis_gecmisi_siparis" ON "siparis_gecmisi" USING btree ("siparis_kimligi","zaman");--> statement-breakpoint
CREATE UNIQUE INDEX "siparis_kalemleri_sira" ON "siparis_kalemleri" USING btree ("siparis_kimligi","sira");--> statement-breakpoint
CREATE UNIQUE INDEX "siparisler_numara" ON "siparisler" USING btree ("numara");--> statement-breakpoint
CREATE UNIQUE INDEX "siparisler_oturum" ON "siparisler" USING btree ("oturum_kimligi");--> statement-breakpoint
CREATE INDEX "siparisler_musteri" ON "siparisler" USING btree ("musteri_kimligi","olusturma_zamani");--> statement-breakpoint
CREATE INDEX "siparisler_erisim" ON "siparisler" USING btree ("erisim_ozeti");--> statement-breakpoint
CREATE INDEX "siparisler_havale_bekleyen" ON "siparisler" USING btree ("odeme_son_zamani") WHERE "siparisler"."durum" = 'odeme-bekleniyor' and "siparisler"."odeme_son_zamani" is not null;--> statement-breakpoint
CREATE FUNCTION "siparis_gecmisi_degistirilemez"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'siparis gecmisi sonradan degistirilemez' USING ERRCODE = 'restrict_violation';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "siparis_gecmisi_degistirilemez" BEFORE UPDATE OR DELETE OR TRUNCATE ON "siparis_gecmisi" FOR EACH STATEMENT EXECUTE FUNCTION "siparis_gecmisi_degistirilemez"();
--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'odeme-yontemi.gor' FROM "roller" WHERE "kod" = 'gorevli';
