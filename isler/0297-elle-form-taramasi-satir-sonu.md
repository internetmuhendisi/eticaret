# 0297 · Panelin elle Form taraması satır sonunda biten yazılışı görmüyor

## Amaç

Kart 0267'de bulundu. `cekirdek/yonetim-paneli/testler/panel-formu.test.tsx` panelde elle `<Form>` kullanan dosyayı satır satır `/<Form[\s>]/` ile arar. Biçimleyici çok özellikli öğeyi alt satıra böldüğünde satır `<Form` ile biter; satırın sonunda boşluk ya da `>` olmadığı için tarama onu görmez. Kart 0267'nin yeni dosyası (`liste/tarih-suzgeci.tsx`) böyle yazılıydı ve taramadan geçti (dosya bilerek istisna listesine eklendi).

Ölçüm (2026-11-23): bugün panelde ve eklentilerin panel ekranlarında satır sonunda biten `<Form` yalnız istisna listesindeki dosyalarda var (`panel-formu.tsx`, `giris-formu.tsx`, `kod-formu.tsx`, `liste/liste.tsx`, `liste/tarih-suzgeci.tsx`). Yani bugün ihlal yok, yalnız tarama zayıf.

Bölüm: Yönetim paneli.

## Olmazsa olmazlar

- Tarama satır sonunda biten `<Form` yazılışını da yakalar; bozuk örneği testte.
- İstisna listesi değişmez.

## Sınırlar

- Ortak form yapısı ve istisnaların gerekçesi bu kartın işi değildir.

## Bitti sayılır

- Tarama düzeltildi; satır sonunda biten `<Form` yazan geçici bir panel dosyasıyla kırmızı, kaldırılınca yeşil.

## Durum

yapılacak
