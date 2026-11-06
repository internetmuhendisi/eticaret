# 0047 · TRACE isteği sınırsız hata kaydı üretiyor

## Amaç

`curl -X TRACE <site>/kapi/herkese-acik/saglik` 500 döndürüyor ve günlüğe hata seviyesinde `'TRACE' HTTP method is unsupported` yazılıyor. Hata uca gelmeden Next.js'in içinde çıktığı için istek sınırı devreye girmiyor. Dışarıdan biri günlüğü şişirebilir, gerçek hatalar gürültüde kaybolabilir (kart 0045'in bağımsız kontrolünde ölçüldü).

## Olmazsa olmazlar

- Hatanın hata izleme aracına gidip gitmediği ölçülür.
- Desteklenmeyen yöntem hata kaydı üretmez; yanıtı sabit kodlu olur.
- Çözümün yeri (ön kapı ya da uygulama) karar kaydına yazılır.

## Sınırlar

- İstek sınırının kendisi değişmez.

## Bitti sayılır

- Test ya da deneme, TRACE isteğinin hata kaydı üretmediğini gösteriyor.
- Olağan yöntemler eskisi gibi çalışıyor.

## Durum

yapılacak
