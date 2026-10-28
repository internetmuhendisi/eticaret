# 0016 · Paket yöneticisi pnpm, Node.js 24

## Tarih

2026-10-28

## Karar

- Paket yöneticisi pnpm'dir. Sürümü kökteki `package.json` dosyasında sabitlenir (`packageManager`), şu an 12.15.0.
- Node.js'in uzun destekli 24 sürümü kullanılır. Tam sürüm kökteki `package.json` dosyasında sabitlenir (`devEngines.runtime`), şu an 24.22.1. pnpm bu sürümü projeye özel indirir, bilgisayardaki Node.js sürümüne bağlı kalınmaz.
- TypeScript tek bir ortak ayar dosyasından (`tsconfig.temel.json`) en sıkı ayarlarla çalışır. Her paket bu dosyayı kullanır. Bütün çalışma alanının tür kontrolü tek komuttur: `pnpm tur-kontrolu`.
- Paketler her zaman tam sürümle eklenir, kilit dosyası (`pnpm-lock.yaml`) kayda girer.

## Neden

- pnpm, bir paketin listesinde yazmayan başka bir pakete gizlice erişmesine izin vermez. Bu sayede her çekirdek sürümünün paket kilidi (0013) gerçekten kullanılanı gösterir. Aynı paket diskte bir kez tutulur, kurulum hızlıdır.
- Node.js 22'nin desteği Nisan 2027'de biter. 24 ise 2028'e kadar destek alır.
- Node.js sürümünü pnpm'in indirmesi, kodun her bilgisayarda ve Docker kutusunda aynı sürümle çalışmasını sağlar.

## Düşünülen diğer yollar

- npm: Seçilmedi. Node.js ile birlikte gelir, ama bir paketin listesinde yazmayan bir pakete erişmesini engellemez ve çalışma alanında daha yavaştır.
- Yarn: Seçilmedi. pnpm'e göre bir üstünlüğü yok ve birden çok sürümü birbirinden çok farklı çalışıyor.
- Node.js 22: Seçilmedi. Bilgisayarda kuruluydu, ama desteği yakında bitiyor.
- Node.js'i bilgisayara elle kurmak (nvm gibi): Seçilmedi. Her bilgisayarda ayrıca yapılması gerekir ve unutulabilir.

## Sonuçları

- Komutlar `npm` ile değil `pnpm` ile çalıştırılır. `npm install` çalışma alanını doğru kurmaz.
- pnpm ve Node.js sürümü yükseltilirken `package.json` dosyasındaki ilgili alanlar birlikte değişir ve yükseltme yeni bir çekirdek sürümüyle sitelere gider (0013).
- TypeScript 7.0.2 kullanılıyor. Next.js ile uyumu, Next.js'in kurulduğu iş kartında (0009) doğrulanır. Uyumsuzluk çıkarsa TypeScript'in 5 serisine dönülür.
- Henüz kodu olmayan paketlerin tür kontrolünden geçebilmesi için paket ayarlarında boş bir dosya listesi (`"files": []`) durur. Paketlere kod eklendikçe bu satır etkisini kaybeder, kaldırılması gerekmez.
