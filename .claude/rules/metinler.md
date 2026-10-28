---
paths:
  - "**/metinler/**"
  - "**/*bicim*"
  - "cekirdek/moduller/eposta/**"
  - "**/*.tsx"
---

# Metin, çeviri ve biçimler

- Ekranda görünen metni koda yazma. Bütün metinleri metin dosyasında anahtarla tut, kod yalnız anahtarı kullansın.
- Metin dosyalarını modüle göre ayır. Anahtarlar "modül.bölüm.anahtar" biçiminde olsun.
- Altyapı bugün tek dilde çalışsa da metinleri sonradan çevrilebilecek biçimde tut. Sitenin dili site ayarıdır, çekirdekte Türkçe sabit varsayılmaz.
- Metinler `cekirdek/metinler/` altındaki dil dosyalarındadır (`tr.json`) ve yalnız `metinOkuyucu` ile okunur (`metin.ts`). Olmayan anahtar tür kontrolünde hata verir (karar 0019).
- Sayı, tarih, saat, para ve dosya boyutunu tek ortak biçimleyiciyle göster (`cekirdek/metinler/bicimleyici.ts`). Elle biçimlendirme.
- Para tutarı her yerde para biriminin en küçük biriminde (kuruş) tam sayıdır (karar 0019).
- Para birimi ve biçimi (simgenin yeri, binlik ve ondalık ayırıcı, ondalık sayısı) ile ölçü birimleri site ayarından gelir. Türkiye'de 1.234,56 ₺.
- Tarih ve saati mağazanın saat dilimine göre göster. Saat dilimini tek yerden al.
- Sunucu hata ve durum bildirirken düz cümle değil bir kod döndürsün. Metni ekran çözer.
- Ürünün kavramlarının tek adı olsun. Bu adları terim sözlüğü dosyasında tut, sözlükte olmayan başka bir adı kullanma.
- Ekrandaki her iddiayı ürünün gerçek davranışıyla doğrula. Değişecek sayıları metne yazma.
- Hata mesajında ne olduğunu ve kullanıcının ne yapması gerektiğini söyle.
- Boş liste kullanıcıya bir sonraki adımı ve o adımın düğmesini göstersin.
