---
paths:
  - "cekirdek/izleme/**"
  - "cekirdek/arka-plan-isleri/**"
  - "**/instrumentation.*"
  - "**/error.tsx"
  - "**/global-error.tsx"
  - "sunucu/**"
---

# Hata yönetimi ve izleme

- Sunucuda ve ekranda oluşan bütün hataları ortak bir hata katmanında yakala ve kaydet.
- Canlıdaki hataları bir hata izleme aracına gönder. Hata kullanıcıdan önce görülsün.
- Sunucu kayıtlarını seviyeli tut: bilgi, uyarı, hata, ölümcül.
- Sitenin açılmasını, ödemeyi ve e-posta gönderimini düzenli olarak otomatik kontrol et.
- Bir bölümde oluşan hata yalnız o bölümde gösterilsin, sayfanın geri kalanı çalışsın.
