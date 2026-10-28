# eticaret

## Proje nedir

**eticaret** (geçici ad), tek yerden yönetilen, birbirinden bağımsız e-ticaret sitelerinin altyapısıdır.

- Bütün sitelerin ortak kullandığı motora **çekirdek** denir: ürün, sepet, ödeme, sipariş, panel.
- O motoru kullanan her mağaza bir **site**dir. Her sitenin kendi markası, tasarımı, ayarları ve ayrı veritabanı vardır.
- Siteleri altyapı sahibi barındırır ve günceller. Mağaza sahibi yalnız kendi sitesinin yönetim paneline girer.
- Mağazalar şimdilik yalnız Türkiye'de kurulur.

Projenin kuralları `CLAUDE.md` dosyasındadır.

## Klasörler

| Klasör ya da dosya | Ne işe yarar |
|---|---|
| `CLAUDE.md` | Projenin ana kural dosyası. |
| `temel-paket.md` | Her siteye olduğu gibi kurulan temel özelliklerin listesi. |
| `.claude/rules/` | Konu konu ayrıntılı kurallar. |
| `.claude/commands/` | Projenin kendi komutları. |
| `.claude/settings.json` | İzinler ve yasaklar. |
| `kararlar/` | Numaralı karar kayıtları ve gerekçeleri. |
| `tarihce/` | Yapılan işlerin aylık kısa kaydı. |
| `planlar/` | Büyük işlerden önce yazılan planlar ve site ayarları taslağı. |
| `isler/` | Yapılacak işlerin numaralı kartları. |
| `eklentiler/` | Temel paket dışındaki özelliklerin tarifleri. |
