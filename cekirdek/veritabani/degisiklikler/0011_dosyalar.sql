-- Geri dönüş: geri alınabilir. Eski kod bu tabloyu kullanmaz, tablo ve satırları yerinde kalır; silinmez.
CREATE TABLE "dosyalar" (
	"kimlik" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tur" text NOT NULL,
	"boyut" integer NOT NULL,
	"genislik" integer NOT NULL,
	"yukseklik" integer NOT NULL,
	"icerik_ozeti" text NOT NULL,
	"olusturma_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"silinme_zamani" timestamp with time zone
);
