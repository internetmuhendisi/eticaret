# 0225 · Güvenlik taramasındaki picomatch istisnasını kaldır

## Amaç

Güvenlik taraması `picomatch`'in GHSA-fc5q-39xc-vjpf açığını, düzeltilmiş sürümü olmadığı için süreli istisnayla yok sayıyor (karar 0143). Düzeltme çıkınca paket güncellenmeli ve istisna kaldırılmalı.

## Olmazsa olmazlar

- Düzeltilmiş sürümün çıktığı GitHub açık sayfasından ölçülür (https://github.com/advisories/GHSA-fc5q-39xc-vjpf).
- `picomatch`'i getiren paketler (`pnpm why picomatch`) düzeltilmiş sürümü alacak biçimde güncellenir.
- `pnpm-workspace.yaml` içindeki `auditConfig.ignoreGhsas` satırı kaldırılır. Listede başka istisna kalmazsa `auditConfig` de kaldırılır.
- `pnpm guvenlik-taramasi` istisnasız yeşil geçer.
- Karar 0143'e "yerine geçti" notu gerekmez: istisnanın kaldırılması kararın kendi sonucudur.

## Sınırlar

- Başka paketlerin güncellenmesi bu işe karışmaz.

## Bitti sayılır

- `pnpm-workspace.yaml` içinde bu açığın kimliği yok.
- `pnpm guvenlik-taramasi` istisnasız yeşil.
- `.claude/rules/kurallari-koruyan-kontroller.md` tablosundaki Güvenlik kontrolleri satırından istisna notu çıkarıldı.

## Durum

yapılacak
