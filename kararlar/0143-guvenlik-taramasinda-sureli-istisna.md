# 0143 · Güvenlik taramasında süreli istisna

## Tarih

2026-11-18

## Karar

Güvenlik taraması (`pnpm guvenlik-taramasi`) `picomatch` paketindeki GHSA-fc5q-39xc-vjpf açığını yok sayar. İstisna `pnpm-workspace.yaml` dosyasında açığın kimliğiyle yazılır, pakete ya da dereceye göre değil. Paketin düzeltilmiş sürümü çıkınca istisna kaldırılır (kart 0225). Bundan sonraki her istisna da aynı biçimde, açığın kimliğiyle ve kendi karar kaydıyla yazılır.

## Neden

- Kart 0215'in hattı (çalışma 44151467953) bu açık yüzünden güvenlik taramasında durdu, testler hiç çalışmadı. Açığın düzeltilmiş sürümü yok, güncellemeyle kapanamıyor.
- Paket yalnız geliştirme araçlarında var (`vite` ile geliyor). Canlıda kullanılan paketlerin taraması temiz.
- Açık, dosya adı kalıbı işlenirken aşırı yavaşlama (ReDoS). Kalıpları dışarıdan gelen bir girdi değil, kendi test ve derleme ayarlarımız veriyor.
- Kullanıcı kararı (2026-11-18): istisna yazılsın.

## Düşünülen diğer yollar

- Düzeltilmiş sürümü beklemek: o zamana kadar hat kırmızı kalır, hiçbir gönderimde testler çalışmaz ve yayın yapılamaz.
- Geliştirme paketlerinin eşiğini "yüksek"ten "kritik"e çekmek: bu açığın dışındaki yüksek açıkları da görünmez yapardı.
- `picomatch`'i başka bir sürüme zorlamak: açık bütün sürümlerde (<=4.0.7) var, kazancı olmaz.

## Sonuçları

- Bu açık tarama tarafından artık yakalanmaz. Düzeltme çıktığında taramanın bunu söylemesi gerekmez, istisnayı kart 0225 ile elle kaldırmak gerekir. Kaldırmanın unutulmaması yalnız disiplindir.
- Bu açığın ileride canlı pakete geçmesi de yakalanmaz, çünkü istisna iki taramada da geçerlidir.
- Yeni çıkan açıklar ve aynı paketteki başka kimlikli açıklar yakalanmaya devam eder.
