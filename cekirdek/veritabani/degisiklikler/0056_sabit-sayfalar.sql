-- Geri dönüş: geri alınabilir. Yeni tablo, menü öğesine iki boş alan ve tetikleyici; eski kod tabloyu ve alanları bilmez, genişleyen denetimlere ("sayfa", "blog-yazisi") yazmaz. Geri dönüşte tablo ve alanlar kalır, sayfalar okunmaz; sayfaya ya da blog yazısına bağlı menü öğesi varken eski kod o öğeyi okuyamaz (önce öğeler silinir).
-- Kart 0273: sabit sayfalar; menü öğesi sabit sayfaya ve blog yazısına bağlanır; sayfanın adres adı değişince ya da sayfa silinince eski adres saklanır (eski_adresi_sakla, değişiklikler 0031 ve 0032).
CREATE TABLE "sabit_sayfalar" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"baslik" text NOT NULL,
	"adres_adi" text NOT NULL,
	"icerik" text DEFAULT '' NOT NULL,
	"aciklama" text,
	"durum" text NOT NULL,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"guncellenme_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"silinme_zamani" timestamp with time zone,
	CONSTRAINT "sabit_sayfalar_durum" CHECK ("sabit_sayfalar"."durum" in ('yayinda', 'taslak'))
);
--> statement-breakpoint
ALTER TABLE "eski_adresler" DROP CONSTRAINT "eski_adresler_tur";--> statement-breakpoint
ALTER TABLE "menu_ogeleri" DROP CONSTRAINT "menu_ogeleri_hedef";--> statement-breakpoint
ALTER TABLE "menu_ogeleri" ADD COLUMN "sayfa_kimligi" uuid;--> statement-breakpoint
ALTER TABLE "menu_ogeleri" ADD COLUMN "blog_yazisi_kimligi" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "sabit_sayfalar_adres_adi" ON "sabit_sayfalar" USING btree ("adres_adi") WHERE "sabit_sayfalar"."silinme_zamani" is null;--> statement-breakpoint
ALTER TABLE "menu_ogeleri" ADD CONSTRAINT "menu_ogeleri_sayfa_kimligi_sabit_sayfalar_kimlik_fk" FOREIGN KEY ("sayfa_kimligi") REFERENCES "public"."sabit_sayfalar"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_ogeleri" ADD CONSTRAINT "menu_ogeleri_blog_yazisi_kimligi_blog_yazilari_kimlik_fk" FOREIGN KEY ("blog_yazisi_kimligi") REFERENCES "public"."blog_yazilari"("kimlik") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eski_adresler" ADD CONSTRAINT "eski_adresler_tur" CHECK ("eski_adresler"."kayit_turu" in ('kategori', 'marka', 'etiket', 'urun', 'blog-yazisi', 'sayfa'));--> statement-breakpoint
ALTER TABLE "menu_ogeleri" ADD CONSTRAINT "menu_ogeleri_hedef" CHECK ("menu_ogeleri"."hedef_turu" in ('kategori', 'marka', 'urun', 'sayfa', 'blog-yazisi', 'adres', 'baslik')
        and ("menu_ogeleri"."hedef_turu" = 'kategori') = ("menu_ogeleri"."kategori_kimligi" is not null)
        and ("menu_ogeleri"."hedef_turu" = 'marka') = ("menu_ogeleri"."marka_kimligi" is not null)
        and ("menu_ogeleri"."hedef_turu" = 'urun') = ("menu_ogeleri"."urun_kimligi" is not null)
        and ("menu_ogeleri"."hedef_turu" = 'sayfa') = ("menu_ogeleri"."sayfa_kimligi" is not null)
        and ("menu_ogeleri"."hedef_turu" = 'blog-yazisi') = ("menu_ogeleri"."blog_yazisi_kimligi" is not null)
        and ("menu_ogeleri"."hedef_turu" = 'adres') = ("menu_ogeleri"."adres" is not null)
        and ("menu_ogeleri"."hedef_turu" not in ('adres', 'baslik') or "menu_ogeleri"."metin" is not null)
        and ("menu_ogeleri"."hedef_turu" = 'adres' or not "menu_ogeleri"."yeni_sekme"));--> statement-breakpoint
CREATE TRIGGER "sabit_sayfalar_eski_adres" AFTER UPDATE OF "adres_adi", "silinme_zamani" ON "sabit_sayfalar" FOR EACH ROW EXECUTE FUNCTION "eski_adresi_sakla"('sayfa');
