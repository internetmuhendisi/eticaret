-- Geri dönüş: geri alınabilir. Yeni iki hazır rol ve izinleri, görevliye kendi yedek kodlarını yenileme izni; eski kod yeni rolleri ve izni bilmez, kullanmaz. Geri dönüşte roller yerinde kalır; bu rollere sahip yönetici eski kodda yalnız bu izinlere sahip olur.
-- Kart 0274 (karar 0178): "Sipariş görevlisi" ve "İçerik editörü" hazır rolleri (karar 0157); görevli kendi yedek kodlarını yeniler (kart 0053).
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'ekip.kendi-hesabi.degistir' FROM "roller" WHERE "kod" = 'gorevli';
--> statement-breakpoint
INSERT INTO "roller" ("kod", "tam_yetki") VALUES ('siparis-gorevlisi', false);
--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'ekip.kendi-hesabi.gor' FROM "roller" WHERE "kod" = 'siparis-gorevlisi';
--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'ekip.kendi-hesabi.degistir' FROM "roller" WHERE "kod" = 'siparis-gorevlisi';
--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'siparis.gor' FROM "roller" WHERE "kod" = 'siparis-gorevlisi';
--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'siparis.yonet' FROM "roller" WHERE "kod" = 'siparis-gorevlisi';
--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'siparis.havale-onayla' FROM "roller" WHERE "kod" = 'siparis-gorevlisi';
--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'musteri.gor' FROM "roller" WHERE "kod" = 'siparis-gorevlisi';
--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'odeme-yontemi.gor' FROM "roller" WHERE "kod" = 'siparis-gorevlisi';
--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'dosya.gor' FROM "roller" WHERE "kod" = 'siparis-gorevlisi';
--> statement-breakpoint
INSERT INTO "roller" ("kod", "tam_yetki") VALUES ('icerik-editoru', false);
--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'ekip.kendi-hesabi.gor' FROM "roller" WHERE "kod" = 'icerik-editoru';
--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'ekip.kendi-hesabi.degistir' FROM "roller" WHERE "kod" = 'icerik-editoru';
--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'icerik.gor' FROM "roller" WHERE "kod" = 'icerik-editoru';
--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'icerik.degistir' FROM "roller" WHERE "kod" = 'icerik-editoru';
--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'icerik.sil' FROM "roller" WHERE "kod" = 'icerik-editoru';
--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'duzen.gor' FROM "roller" WHERE "kod" = 'icerik-editoru';
--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'duzen.degistir' FROM "roller" WHERE "kod" = 'icerik-editoru';
--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'menu.gor' FROM "roller" WHERE "kod" = 'icerik-editoru';
--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'menu.degistir' FROM "roller" WHERE "kod" = 'icerik-editoru';
--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'dosya.gor' FROM "roller" WHERE "kod" = 'icerik-editoru';
--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'urun.gor' FROM "roller" WHERE "kod" = 'icerik-editoru';
