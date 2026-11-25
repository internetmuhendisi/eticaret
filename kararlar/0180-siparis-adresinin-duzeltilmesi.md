# 0180 · Siparişin teslimat ve fatura bilgilerinin düzeltilmesi

## Tarih

2026-11-25

## Karar

- **Ne düzeltilir (kullanıcı kararı):** teslimat (ad, soyad, telefon, adres) ve fatura bilgileri birlikte: faturanın türü, kurumsal faturada firma adı, vergi dairesi ve vergi numarası, fatura adresi ("teslimat adresiyle aynı" dahil). Taslakta yalnız teslimat vardı; yanlış vergi numarası yüzünden siparişin iptal edilmemesi için fatura da eklendi.
- **Ne zaman:** kargoya verilene kadar (ödeme bekleniyor, hazırlanıyor; karar 0157). Kişisel bilgisi silinmiş siparişte düzeltme yoktur. İzin `siparis.yonet`.
- **Doğrulama:** ödeme adımının şemaları ve kuralları (il ve ilçe tutarlı, telefon biçimi, kurumsal vergi numarası faturanın ülkesinin kuralıyla). Sitenin bugünkü ayarına bağlı teslimat kuralları (telefon zorunluluğu, teslimat ülkesi) yalnız teslimat değişince uygulanır: sonradan açılan bir ayar yalnız faturanın düzeltmesini engellemez. Elle siparişle aynı alanlar.
- **Çakışma:** ekran pencerenin açıldığı andaki hâlin özetini (`surum`: durum, teslimat ve fatura) gönderir; satır kilitlenir, arada değişen sipariş `cakisma` alır, hiçbir şey yazılmaz.
- **Vergi:** düzeltme verginin bölgesini değiştirmiyorsa serbesttir. Değiştiriyorsa sitenin bugünkü vergi tablosunda iki bölgenin oranları sınıf sınıf karşılaştırılır (`bolgelerinOranlariAyniMi`); aynıysa serbest, değilse reddedilir (`vergi-bolgesi-degisir`, "siparişi iptal edip yenisini girin"). Bölge `vergiAdresi` ayarının adresidir, tabloda yoksa mağaza adresi; hesabın kendisiyle aynı seçim (`vergiBolgesiniSec`). Vergi kapalı verilmiş (`gosterim` "yok") ya da vergilenmiş kalemi olmayan (vergi dökümü boş) siparişte bölge önemsizdir. Ret, bölgeyi değiştiren alana (ülke, il ya da posta kodu) bağlanır. Siparişin tutarı ve vergisi hiçbir düzeltmede değişmez.
- **Kayıt:** geçmişe "adres-duzeltildi" (durum değişmez); önceki ve yeni bilgiler `siparis_adres_duzeltmeleri` tablosuna; değişiklik kaydına yalnız değişen alanların adları ve teslimatın ülke, il ve ilçe kodları ile faturanın türü. Panelin geçmişinde değişen önceki bilgiler görünür. Aynı bilgiler bir şey yazmaz.
- **Müşteriye bildirim:** "Sipariş bilgileriniz güncellendi" e-postası, panelde kutu varsayılan işaretli (taslak); e-posta teslimat ya da fatura bilgilerinin düzeltildiğini söyler ve güncel teslimat adresini gösterir, fatura bilgisi yoktur. Müşterinin sipariş sayfası, takip sayfası ve sipariş fişi düzeltilmiş bilgiyi okur.
- **Kişisel veri:** temizlik düzeltmelerin satırlarını siler; geçmişin satırı kalır.

## Neden

- Önceki bilgilerin geçmiş tablosuna değil ayrı tabloya yazılması: geçmiş değiştirilemezdir (tetikleyici), kişisel bilgi yazılırsa saklama süresi dolunca silinemezdi.
- Vergiyi oranlarla karşılaştırmak: siparişte kalemin vergi sınıfı saklanmaz, tutarı yeniden hesaplamak eski fiyatlara bağlı olurdu. Oranlar iki bölgede aynıysa hiçbir kalemin vergisi değişemez. Karşılaştırma bütün sınıflara bakar, siparişin kalemlerinin sınıfına değil (saklanmaz): farklı oranlı bir sınıf siparişte olmasa da ret verir; güvenli yöndedir, vergisiz siparişte hiç uygulanmaz.
- Özetle çakışma: ekran yalnız açtığı hâli ezebilir; başka yöneticinin ya da durum işleminin arada yaptığı değişiklik kaybolmaz.

## Düşünülen diğer yollar

- **Yalnız teslimat adresi (taslak):** kullanıcı fatura bilgilerinin de düzeltilmesini seçti.
- **Bölge değişince her zaman reddetmek:** daha basit, ama vergisi değişmeyen düzeltmeleri (aynı oranlı il) gereksiz yere engellerdi.
- **Vergiyi yeniden hesaplayıp siparişin tutarını değiştirmek:** ödemesi alınmış ya da müşteriye bildirilmiş tutarı değiştirirdi; taslak reddi seçti.
- **Değişiklik kaydına eski ve yeni adresi yazmak:** kayıt kişisel veri taşıyamaz (karar 0045) ve temizlikte silinmez.

## Sonuçları

- Vergi karşılaştırması sitenin bugünkü tablosunu ve ayarını okur: sipariş verildikten sonra oranlar ya da `vergiAdresi` değiştiyse karşılaştırma bugünkü kurala göredir (yalnız disiplin, testte yok).
- Ödeme oturumunun kendi kopyası düzeltilmez (siparişe dönmüş oturum yalnız tekrar denetimi için kalır).
- Kuyruğa girmiş eski e-postalar eski adresi taşır.
- Ürün ve adet düzeltmesi yoktur (karar 0157): yanlış sipariş iptal edilip elle yenisi girilir.
