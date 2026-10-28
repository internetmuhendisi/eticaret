# 0005 · Tema seçmek temel pakettedir

## Tarih

2026-10-28

## Karar

Mağaza sahibi panelden tema seçer ve temanın sınırlı ayarlarını değiştirir: renk, yazı tipi, köşe ve düğme biçimi, logo, ana sayfa düzeni. Değişiklik önizlemeden sonra yayınlanır ve geri alınabilir. Bu özellik eklenti değil, temel pakettir.

## Neden

- Tema sonradan eklenti olarak gelirse vitrinin tasarım yapısını baştan değiştirmek gerekir. Vitrin baştan temaya göre kurulursa bu iş bir kez yapılır.
- Ayarlar sınırlıdır, çünkü mağaza sahibi ne seçerse seçsin site okunur ve telefonda düzgün kalmalı.

## Düşünülen diğer yollar

- Tema seçmeyi sonradan eklenti olarak eklemek: Seçilmedi. Vitrinin tasarım yapısını baştan değiştirmeyi gerektirir.
- Mağaza sahibine serbest tasarım hakkı vermek: Seçilmedi. Okunurluk ve telefon uyumu korunamaz.

## Sonuçları

- Vitrin işi tema yapısıyla başlar: temalar, ayar seçenekleri, taslak, önizleme ve yayın sürümleri ilk vitrinle birlikte kurulur.
- Mağaza sahibi temanın açmadığı bir tasarımı panelden yapamaz. Özel tasarım isteyen mağazaya altyapı sahibi kendi temasını yapar, o sitede "Mağaza sahibi temayı değiştirebilir" ayarı kapatılır.
- Kural ayrıntısı: `.claude/rules/tasarim-sistemi.md`, kapsam: `temel-paket.md` (Vitrin yönetimi).
