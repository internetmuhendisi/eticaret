# 0050 · Veritabanı kesintisinde hata izleme aracına giden olay sıklığı

## Amaç

Kart 0049 ile uç hataları araca ulaşmaya başladı. Ön kapı sağlık ucunu 5 saniyede bir yokluyor ve her yoklama veritabanı kapalıyken bir olay gönderiyor; sunucuda olay sınırı yok. Kod okuyarak hesap: sekiz saatlik kesinti site başına yaklaşık 5.760 olay, ziyaretçi istekleri buna eklenir. Bugsink'in saklama sınırının eski kayıtları silip silmediği ölçülmedi.

## Olmazsa olmazlar

- Önce ölçülür: gerçek kesintide kaç olay gidiyor, Bugsink'in proje sınırı ve saklaması eski kayıtlara ne yapıyor.
- Aynı hatanın ilk kaydı her zaman araca ulaşır; hata kullanıcıdan önce görülmeye devam eder.

## Sınırlar

- Olayın içeriği ve maskesi değişmez (karar 0036).

## Bitti sayılır

- Uzun bir kesinti, başka hata kayıtlarının kaybolmasına yol açmıyor. Ölçüldü.
- Kesintinin ilk hatası araca ulaşıyor. Ölçüldü.

## Durum

yapılacak
