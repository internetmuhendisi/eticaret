-- Geri dönüş: geri alınabilir. Yeni tablodur, silinerek geri alınır; içindeki tek satır güncelleme komutuyla yeniden yazılır.
CREATE TABLE "veritabani_kimligi" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_kod_adi" text NOT NULL,
	"olusturulma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "veritabani_kimligi_site_kod_adi_unique" UNIQUE("site_kod_adi")
);
