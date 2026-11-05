---
paths:
  - "cekirdek/izleme/**"
  - "cekirdek/arka-plan-isleri/**"
  - "**/instrumentation.*"
  - "**/error.tsx"
  - "**/global-error.tsx"
  - "cekirdek/uygulama/app/**"
  - "cekirdek/vitrin/**"
  - "cekirdek/yonetim-paneli/**"
  - "cekirdek/kapi/**"
  - "sunucu/**"
---

# Hata yönetimi ve izleme

- Sunucuda ve ekranda oluşan bütün hataları ortak bir hata katmanında yakala ve kaydet.
- Canlıdaki hataları bir hata izleme aracına gönder. Hata kullanıcıdan önce görülsün.
- Sunucu kayıtlarını seviyeli tut: bilgi, uyarı, hata, ölümcül.
- Sitenin açılmasını, ödemeyi ve e-posta gönderimini düzenli olarak otomatik kontrol et.
- Bir bölümde oluşan hata yalnız o bölümde gösterilsin, sayfanın geri kalanı çalışsın.

## Araçlar (karar 0025)

- Sunucuda günlüğe yalnız `gunluk` ile yaz (`cekirdek/izleme/gunluk.ts`). Doğrudan `console` kullanmak denetimde hatadır. Açılışta konsol da günlüğe bağlanır.
- Beklenmeyen bir hatayı yakalayınca `hatayiKaydet` ile kaydet (`cekirdek/izleme/hata-katmani.ts`). Tarayıcıda `istemciHatasiniKaydet` kullan (`cekirdek/izleme/istemci-hata-katmani.ts`). Hata izleme aracı yalnız bu iki dosyadaki bağlama işleviyle bağlanır.
- Günlüğe giden her değer maskelenir (`cekirdek/izleme/maskele.ts`). Kayda yazılacak bir alanın adını şifre, anahtar, token ya da kart sözcükleriyle kurma; böyle bir alan `[gizli]` yazılır.
- Kendi başına bozulabilecek her ekran bölümünü `<Bolum>` içine al (`cekirdek/izleme/bolum.tsx`). Bölüm dışındaki hata sayfayı `error.tsx` ekranına çevirir.

## Hata izleme aracı (karar 0036)

- Araç kendi sunucumuzdaki Bugsink'tir. Her sitenin kod adıyla bir projesi vardır, yayın komutu projeyi açar ve gönderim adresini site kutusuna verir.
- Araca olayı yalnız `cekirdek/izleme/hata-izleme-araci.ts` gönderir. Sunucuda `hata-izleme-baglantisi.ts`, tarayıcıda kök düzendeki `istemci-hata-izleme.tsx` bağlar. Hazır Sentry paketi ekleme: istek başlığını, çerezi ve ziyaretçi adresini kendiliğinden toplar.
- Her olay site kod adı, çekirdek sürümü ve ortamla etiketlenir. Olaya yeni bir alan eklenirse maskeden geçer; ziyaretçi, istek, çerez ve başlık alanı eklenmez.
- Gerçek deneme: `pnpm hata-izleme-denemesi <site klasörü>`. Yönetim ekranı: `pnpm hata-izleme-ac`.
