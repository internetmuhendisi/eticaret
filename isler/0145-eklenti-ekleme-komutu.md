# 0145 · Eklenti ekleme komutu

## Amaç

İlk eklenti (kart 0144) elle kurulduktan sonra aynı adımlar bir komuta çevrilir. Sonraki eklentiler bu komutla, aynı sırayla ve aynı kontrollerden geçerek kurulur (`eklentiler/README.md`, "Eklenti nasıl eklenir").

Bölüm: Vitrin. Önce 0144 bitmiş olmalı.

## Olmazsa olmazlar

- Komut `.claude/commands/` altında yazılır, eklentinin kod adını alır.
- Adımlar kart 0144'te gerçekten yapılanlardan çıkarılır: tarifi okuma, plan, onay, çalışma kopyası, kapalı başlatma, kontroller, tarifin bitti listesi, bağımsız denetim, kayıt.
- Komut tarifi olmayan eklentide durur ve tarifin yazılmasını önerir.
- Komut kullanıcı onayı olmadan yayın yapmaz.
- `CLAUDE.md` ve `eklentiler/README.md`'deki "komut henüz yok" satırları güncellenir.

## Sınırlar

- Komutla ikinci bir eklenti kurulmaz; katalogdaki eklentiler kullanıcı istemeden kurulmaz.

## Bitti sayılır

- Komut, stoğa gelince haber ver eklentisinin adımlarını eksiksiz içeriyor; kullanıcıyla birlikte okundu.
- Tarifi olmayan kod adıyla komut duruyor.

## Durum

yapılacak
