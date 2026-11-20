# 0278 · Mağaza bilgileri ve satıcı bilgileri ekranı

## Amaç

Mağaza adı, iletişim bilgileri (telefon, e-posta, adres), sosyal hesaplar ve satıcı bilgileri (unvan, işletme türü, vergi ya da kimlik numarası, MERSİS, KEP) bugün yalnız sitenin başlangıç dosyasından geliyor (kartlar 0071, 0091). Bu bilgiler vitrinin alt kısmında, e-postalarda ve sipariş fişinde görünür; mağaza sahibi onları panelden değiştiremiyor.

Bölüm: Yönetim paneli. Kullanıcının kararıyla bu bölüme alındı. Önce 0259 (ortak form) bitmiş olmalı; sipariş fişi (0270) bu bilgileri okur.

## Olmazsa olmazlar

- Ayar şemasından çıkan form: mağaza adı, telefon, e-posta, posta adresi (il ve ilçe listeden), sosyal hesaplar, satıcı bilgileri. Alanların kuralları şemadakidir (vergi numarasının kontrol hanesi, KEP alan adı, sosyal hesap kalıbı); hata alanın altında.
- Kayıtta gizli ayarın değeri değişiklik kaydına girmez (kart 0071'in kuralı).
- Değişiklik vitrinde, yeni e-postalarda ve sipariş fişinde hemen görünür; kuyrukta bekleyen e-posta değişmez (karar 0153).
- İzin `magaza-ayarlari.gor` ve `magaza-ayarlari.degistir`; uç belgesi ve rol erişim testi.

## Sınırlar

- Logo ve tema ayarları 0260'tadır.
- Para birimi, ülke ve saat dilimi gibi sitenin kuruluş ayarları panelden değişmez.

## Bitti sayılır

- Gerçek istekle kayıt ve her alan kuralının reddi, vitrinin alt kısmında yeni bilgi; tarayıcıda klavyeyle hata ve kayıt, iki renkte ve üç genişlikte tarama.
- Ekran görüntüsü taslakla yan yana kondu, farklar düzeltildi.
- Bağımsız kontrol yapıldı.

## Durum

yapılacak
