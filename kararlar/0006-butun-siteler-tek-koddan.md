# 0006 · Bütün siteler tek koddan kurulur

## Tarih

2026-10-28

## Karar

Bütün siteler tek koddan kurulur. Her site için ayrı bir kod kopyası tutulmaz. Siteler aynı çekirdeğin farklı sürümlerinde çalışabilir, ama her sürüm aynı kodun bir sürümüdür, siteye ait bir kopya değildir. Sitenin markası, tasarımı ve ayarları kendi klasöründe durur.

## Neden

- Güncellemeler tek elden yapılır (0001). Bir hata bir kez düzeltilir, düzeltme her siteye aynı yoldan gider. Ayrı kopyalarda aynı düzeltme her kopyada ayrı ayrı yapılmak zorunda kalır.
- Kopyalanan parça zamanla ayrışır (`.claude/rules/calisma-duzeni.md`). Ayrışan kopyalar bir süre sonra aynı ürün olmaktan çıkar ve birlikte güncellenemez.
- Siteye özel davranış koda değil ayara yazılır (değişmez kural 1). Tek kod bu kuralın uygulanabilmesinin ön koşuludur.

## Düşünülen diğer yollar

- Her siteye ayrı kod kopyası: Seçilmedi. Her düzeltme ve güvenlik güncellemesi site sayısı kadar tekrarlanır, kopyalar birbirinden ayrışır ve 5–30 site tek elden yönetilemez.

## Sonuçları

- Siteden gelen her özel istek ya bir site ayarına ya da bütün sitelerin kullanabileceği bir özelliğe dönüşür. Bu, siteye özel istekleri karşılamayı yavaşlatır.
- Çekirdekteki her değişiklik, onu alacak bütün siteleri bozmayacak biçimde yazılır ve test edilir.
- Siteler farklı çekirdek sürümlerinde çalışabildiği için her sitenin sürümü kaydedilir, güncelleme site site yapılır (değişmez kural 3).
- Ortak bileşenle yapılamayan bir vitrin bölümü sitenin kendi klasöründe yazılabilir. İkinci bir sitede de gerekince çekirdeğe taşınır (`.claude/rules/vitrin.md`). Bu bir kod kopyası değil, sitenin kendi parçasıdır.
