-- Geri dönüş: geri alınabilir. Eski kod indeksi bilmez; bir PDF'i yalnız bir siparişe bağlar, indeks onu durdurmaz.
-- Kart 0268: bir fatura dosyası yalnız bir siparişindir; aynı anda gelen iki yazımı da durdurur (karar 0170).
CREATE UNIQUE INDEX "siparisler_fatura_dosyasi" ON "siparisler" USING btree ("fatura_dosyasi") WHERE "siparisler"."fatura_dosyasi" is not null;
