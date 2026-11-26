-- Geri dönüş: geri alınabilir. Kaldırılan alan yalnız kart 0312'nin yayınlanmamış ara hâlinde yazılıyordu; geri dönüşte alan boş olarak yeniden eklenir.
-- Kart 0312: ödeme oturumunun kupon kodu alanı kalkar (yerini kupon_kimligi aldı, 0062).
ALTER TABLE "odeme_oturumlari" DROP COLUMN "kupon_kodu";