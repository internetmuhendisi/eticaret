# 0095 · İptal edilen e-posta gönderimi sonradan bağlanmaya çalışıyor

## Amaç

`cekirdek/moduller/eposta/testler/eposta.test.ts` içindeki "süreç kapanınca sessiz sunucuyu beklemez" testinden sonra, test takımı bir kez yakalanmamış bir hata (unhandled rejection) kaydetti: `connect ECONNREFUSED 127.0.0.1:<rastgele port>`, `code: 'ESOCKET', command: 'CONN'`. Port testin açıp kapattığı sessiz sunucunun portudur: gönderim iptal edildikten ve sunucu kapandıktan sonra posta kitaplığı bir kez daha bağlanmaya çalışmış ve bu denemenin hatasını yakalayan yer yok.

Testlerin hepsi geçmesine rağmen yakalanmamış hata Vitest'i 1 ile bitirir: kontrol hattı boş yere kırmızı olabilir. Asıl soru çalışan uygulamada da olup olmadığıdır: kapanan arka plan sürecinde iptal edilen gönderim, süreç kapanırken yakalanmamış bir hata bırakabilir.

Kart 0073 sırasında görüldü (2026-11-07): takımın bir tam çalıştırmasında bir kez; dosya tek başına bu dalda ve ana dalda beşer kez temiz geçti.

Bölüm: Sipariş ve müşteri hesabı. Kart 0240 ile birlikte yapılır.

## Olmazsa olmazlar

- Önce ölçülür: iptalden sonra bağlantıyı kim açıyor (kitaplığın yeniden denemesi, havuz, zamanlayıcı).
- İptal edilen gönderim hiçbir yakalanmamış hata bırakmaz; bu, sessiz sunucu kapandıktan sonra bir süre beklenerek testte gösterilir.
- Arka plan sürecinin kapanışında da aynı durum denenir.

## Sınırlar

- Gönderim akışının kendisi (kuyruk, yeniden deneme) değişmez.

## Bitti sayılır

- Test, takım yük altında çalışırken art arda beş kez yakalanmamış hata bırakmadan geçiyor; ölçüm kartın kapanışında yazılı.

## Kapanış ölçümü (kart 0240 ile, 2026-11-20)

- Sebep ölçüldü: sinyal posta kitaplığı yüklenirken (`await import("nodemailer")` 50 ms'den uzun sürünce) gelirse gönderici gönderimi yine başlatıp `throwIfAborted` ile çıkıyordu; başlamış gönderim sunucu kapandıktan sonra bağlanıp `ESOCKET`/`CONN` `connect ECONNREFUSED 127.0.0.1:<port>` ile reddediliyor, onu bekleyen olmadığı için yakalanmamış hata kalıyordu (kartın hatasının aynısı, ayrı betikle üretildi). Gönderim başladıktan sonraki iptalde yarış hatayı yakalıyordu; kitaplığın kendi yeniden denemesi yok.
- Düzeltme: sinyal gönderimden önce denetlenir; iptalde başlamış gönderimin bağlantısı kapanır, hatası yutulur (`cekirdek/moduller/eposta/gonderici.ts`).
- Test: önceden iptal edilmiş sinyalde sunucuya hiç bağlanılmaz, sunucu kapandıktan sonra 1 saniye beklenir ve yakalanmamış hata yoktur (`eposta.test.ts`). Sinyal denetimi kaldırılınca test kartın hatasıyla kırmızı. Arka plan sürecinin kapanışı aynı yoldan geçer: kapanışta çalıştırıcı sinyali keser ("süreç kapanınca sessiz sunucuyu beklemez" testi).
- Beş çalışma: dosya art arda beş kez (yük ortalaması 4–8), her birinde 32/32 ve yakalanmamış hata yok; günlükteki tek `ECONNREFUSED` testin bilerek kapalı porta (`:1`) gönderdiği denemedir. Tam birim takımı bir kez dört işçiyle (yük ortalaması 10) 3634/3634, yakalanmamış hata yok. Beş çalışmanın bütün takımla aynı anda yapılması ölçülmedi (makine paylaşılıyor).

## Durum

yapılacak
