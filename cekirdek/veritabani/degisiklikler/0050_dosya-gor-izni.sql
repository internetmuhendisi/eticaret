-- Geri dönüş: geri alınabilir. Görevlinin yeni izni eski kodda kullanılmaz, kalabilir.
-- Kart 0261: sitedeki görselleri görme izni (dosya.gor); görevli kategori görselini ve marka logosunu seçebilsin.
INSERT INTO "rol_izinleri" ("rol_kimligi", "izin") SELECT "kimlik", 'dosya.gor' FROM "roller" WHERE "kod" = 'gorevli';
