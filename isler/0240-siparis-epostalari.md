# 0240 · Müşteriye giden sipariş e-postaları

## Amaç

Müşteri siparişinin her önemli adımında e-posta almalı (temel paket: E-postalar). Bugün e-posta yalnız hesap ve şifre için gidiyor (kartlar 0032–0034).

Bölüm: Sipariş ve müşteri hesabı. Önce 0234, 0235 ve 0239 bitmiş olmalı.

## Olmazsa olmazlar

- E-postalar: sipariş alındı (havalede banka hesapları, tutar, son ödeme günü ve açıklamaya yazılacak numara; kapıda ödemede seçenek), havale onaylandı, kargoya verildi (firma, takip numarası ve bağlantısı), teslim edildi (0233 kararıyla), iptal, tam iade, kısmi iade (iade edilen ürünler ve tutar), müşteriye not, iade talebi alındı, onaylandı ve reddedildi.
- Tek şablon sistemiyle (`epostaOlustur`, `epostaGonder`), sitenin tasarım değerleriyle, düz metin karşılığıyla; tutarlar sipariş kaydından, oran oran vergi dökümüyle. Metinler metin dosyasından.
- E-posta siparişin değişikliğiyle aynı işlemde kuyruğa girer: değişiklik geri alınırsa e-posta da gitmez; aynı olay için iki e-posta gitmez (`isKimligi`).
- Üye olmayan müşterinin e-postasında sipariş takibi bağlantısı vardır (numara ve e-posta istenir, bağlantı kendisi siparişi açmaz) ya da 0233'teki karara göre güvenli tek kullanımlık bağlantı.
- Elle siparişte e-postanın gidip gitmeyeceği panelde seçimdir (kart 0236).
- Kart 0095 bu kartta yapılır: iptal edilen gönderim yakalanmamış hata bırakmaz (kartın bitti sayılır listesi bu kartın listesine eklenir). Bu bölümle gönderilen e-posta sayısı artar.
- Testler gerçek veritabanı ve yerel posta kutusuyla: her e-postanın doğru olayda bir kez gittiği, geri alınan işlemde gitmediği, içeriğin tutarı ve vergi dökümünü sipariş kaydıyla aynı verdiği, HTML kaçışı, gönderen adresi olmayan sitede gitmediği, iki site. E-postaların taslakla karşılaştırması gerçek posta kutusundaki e-postanın görüntüsüyle, telefon ve bilgisayar genişliğinde. Her yeni denetim bilerek bozularak kırmızıya düşüyor.

## Sınırlar

- Yönetici bildirimleri kart 0241'dedir.
- E-posta metinlerinin, gönderen adının ve alt bilginin panelden düzenlendiği ekran on dördüncü bölümdedir.
- Gerçek gönderim hizmeti kart 0060'tadır; sunucuda e-posta bugün yalnız yerel kutuya gider.

## Bitti sayılır

- Listelenen her e-posta doğru olayda bir kez gidiyor, geri alınan değişiklikte gitmiyor (test).
- E-postadaki tutar ve vergi sipariş kaydıyla aynı (test).
- Kart 0095'in bitti sayılır maddesi karşılandı.
- Taslakla karşılaştırma yapıldı.

## Durum

yapılacak
