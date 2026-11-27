# 0337 · Excel dosyası fiyat girişi değişmeden önce indirildiyse yeni ürün satırlarının fiyatı yanlış girişte yazılır

## Amaç

Kart 0326'nın bağımsız kontrolünde bulundu. Fiyat girişi (vergi dahil ya da hariç) değişince kayıtlı fiyatlar çevrilir (karar 0201). Excel ile toplu ürün işlemlerinde var olan satırlar "indirildiği andaki değer" denetimiyle korunur: çevrilen fiyat indirildiği andakinden farklı olduğu için değiştirilmiş hücre hatalı satır olur. Ama dosyaya eklenen yeni ürün satırlarının fiyatı eski girişle yazılmış olabilir ve yeni girişle okunur: fiyat vergi oranı kadar kayar.

Bölüm: Yönetim paneli 2 (eklenti: excel-ile-toplu-urun-islemleri).

## Olmazsa olmazlar

- Dosya, indirildiği andan sonra fiyat girişi değiştiyse (`fiyat_girisi_gecmisi`, `girisDegisiklikleriniOku`) fiyat taşıyan yeni satırlar hatalı satır olur, nedeni söylenir; indirilme anı bilinmeyen dosyada da önizleme uyarır.
- Kural eklentinin tarifine ve karar kaydına yazılır.

## Sınırlar

- Fiyat girişinin değişikliğinin kendisi kart 0326'dadır.

## Bitti sayılır

- Gerçek veritabanıyla: giriş değişikliğinden önce indirilen dosyanın yeni ürün satırı uygulanmaz, sonra indirilen uygulanır; bozma denemesi kırmızı.

## Durum

yapılacak
