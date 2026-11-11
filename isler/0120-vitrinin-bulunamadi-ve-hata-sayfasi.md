# 0120 · Vitrinin "bulunamadı" ve hata sayfası çerçevenin içinde

## Amaç

Kart 0108'in bağımsız kontrolü ölçtü: vitrinde olmayan bir adres (örneğin menüdeki `/kategori/giyim`, kategori sayfası henüz yazılmadığı için) Next.js'in İngilizce "404: This page could not be found" sayfasını açıyor. Sayfada üst ve alt kısım yok, müşteri menüye ve ana sayfaya dönemiyor. `app/error.tsx` de vitrin çerçevesinin (`app/(vitrin)/layout.tsx`) üstünde duruyor: bir vitrin sayfası hata verince üst ve alt kısım da kayboluyor (koddan çıkarıldı, tarayıcıda denenmedi). Temel paketin Görünürlük satırı 404 sayfasını istiyor.

Bölüm: Vitrin. On birinci bölümde açık kartlardan bu bölüme alındı.

## Olmazsa olmazlar

- Önce iki durum tarayıcıda ölçülür: olmayan vitrin adresi ve hata veren vitrin sayfası.
- Olmayan vitrin adresi sitenin dilinde, metin dosyasından gelen bir "bulunamadı" sayfası açar; üst ve alt kısım görünür, durum kodu 404 kalır.
- Hata veren vitrin sayfası üst ve alt kısmı koruyarak hata ekranını içerikte gösterir.
- Panel (`/yonetim`), kapı uçları (`/kapi`) ve geliştirme sayfaları bundan etkilenmez: kapının 404 zarfı ve panelin kendi sayfaları aynı kalır.
- Arama motorlarına "bulunamadı" sayfası dizine girmez.

## Sınırlar

- Kategori, marka ve ürün sayfaları bu işe girmez.

## Bitti sayılır

- Olmayan vitrin adresi 404 durum koduyla, sitenin dilinde ve üst ve alt kısımla açılıyor (tarayıcı testi).
- Hata veren vitrin sayfasında üst ve alt kısım görünüyor (tarayıcı testi).
- Kapının ve panelin 404 davranışını ölçen var olan testler yeşil.

## Durum

yapılacak
