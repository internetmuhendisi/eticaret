# 0096 · Katalog Canlı Çarşı taslağıyla yeniden karşılaştırıldı

## Tarih

2026-11-10

## Karar

Bölüm kütüphanesi `planlar/tasarim-yonu/secenekler.html` ile bilgisayar (1280 px) ve telefon (390 px) genişliğinde, açık temada bölüm bölüm yan yana kondu, hesaplanan stiller ve görsel ölçüleri ölçüldü. Dört fark düzeltildi:

- **Menü satırı:** Öğelerin arasında 8 px aralık yoktu.
- **Geniş afiş ("yan yana"):** İç boşluk telefonda 24 px'ti, taslakta 32 px.
- **Bülten başlığı:** Telefonda 22 px'ti, taslakta 24 px.
- **İkili tanıtım ("görsel solda"):** Görselin alanında 24 px iç boşluk görseli küçültüyordu (bilgisayarda 198 px, taslakta 227 px).

Taslaktaki ürün görselleri kart 0115'te silinen PNG dosyalarına bakıyordu; bağlantılar yeni fotoğraflara çevrildi.

## Neden

Taslak kullanıcının seçtiği yöndür (karar 0075). Bu dört fark daha önceki kararlarda ele alınmamıştı ve ölçekteki değerlerle karşılanabiliyordu.

## Düşünülen diğer yollar

- **Fırsat panelinin 28 px iç boşluğu:** Ölçekte 28 yok. Ölçek bu tek yer için genişletilmedi, bilgisayarda 32 ve telefonda 24 px kaldı.
- **Görsel oranlarını taslakla birebir yapmak (42%, 72%, 86%, 420 ve 240 px):** Ölçekteki kesirler ve ölçüler en yakın değeri veriyor, fark birkaç pikseldir.

## Sonuçları

Bilerek bırakılan farklar: arama kutusu, telefonda hesap ve hesabın yazısı, duyuru şeridinin yüksekliği, alt kısım bağlantılarının yüksekliği, sütun başlığı boyu (karar 0084); afişte durdurma düğmesi ve fiyat, 44 px afiş düğmesi, rozet ve metin boyu (karar 0087); rozet metni, vergi metni, sepet düğmesi (kararlar 0085, 0086); üç sütunlu yatay kartlar, üst yazının harf aralığı, telefonda gizlenmeyen ürünler (karar 0089); seçili olmayan sekmenin kalınlığı (karar 0079); bülten formu ve onay kutusu (karar 0090); yorumlardaki dolu yıldızların rengi (taslakta dolu yıldız yok).

Karşılaştırma bir kez elle yapıldı, stil farklarının kalıcı testi yoktur. Düzeltilen dört farkın sınıfları birim testindedir.
