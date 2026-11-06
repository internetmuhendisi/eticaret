-- Geri dönüş: geri alınabilir. Roller ve izinleri silinerek geri alınır; rol verildikten sonra önce yonetici_rolleri satırları silinmelidir.
INSERT INTO "roller" ("kod", "tam_yetki") VALUES ('magaza-sahibi', true), ('gorevli', false);--> statement-breakpoint
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'ekip.kendi-hesabi.gor' FROM "roller" WHERE "kod" = 'gorevli';
