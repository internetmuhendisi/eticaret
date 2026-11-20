# 0187 · Girişsiz ziyaretçide her sayfada konsola 401 düşmesin

## Amaç

Müşteri gezisinde (2026-11-13) görüldü: girişsiz ziyaretçinin her vitrin sayfasında tarayıcı konsolunda "Failed to load resource: 401" hatası var; hesap durumu sorusundan geliyor (kart 0131). Müşteri görmez ama hata izleme ve konsol denetimini kirletir.

Bölüm: Sipariş ve müşteri hesabı. Kart 0237 ile birlikte yapılır.

## Olmazsa olmazlar

- Hesap durumu girişsiz ziyaretçide hata koduyla değil başarılı bir "girişsiz" cevabıyla döner ya da istek oturum çerezi yokken hiç gitmez.
- Kapı ve erişim testleri güncel.

## Sınırlar

- Oturum ve izin kuralları değişmez.

## Bitti sayılır

- Girişsiz sayfada konsolda hata yok (tarayıcı testi).

## Durum

bitti
