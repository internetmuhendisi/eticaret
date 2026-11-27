# Plan: Siparişleri dışa aktarma (kart 0316)

Durum: 2026-11-27'de yazıldı, kullanıcıya özetlendi ve onaylandı. Uygulamada değişenler karar 0194'te: arama kutusundaki metin kapsamda yoktur; "Dosyayı hazırla" pencereyi kapatır, indirme listenin üstündeki kutudandır (kendiliğinden başlamaz).

Taslak: `planlar/tasarim-yonu/panel-2.html`, "Siparişleri dışa aktar" sayfası (pencere ve "dosya hazırlanıyor" hâli). Yeri karar 0185'te: temel pakette, CSV olarak, satış raporunun CSV indirmesiyle aynı yol; listenin süzgeçleriyle ya da seçilen siparişlerle.

## Ekran

- Siparişler listesinin komut çubuğunda "Dışa aktar" (izin `siparis.gor`). Seçim varken toplu işlem çubuğunda da "Dışa aktar".
- Pencere: "Hangi siparişler" (listedeki N sipariş, süzgeçlerin özetiyle / seçili siparişler), "Satırlar" (her sipariş bir satır / her ürün bir satır), sütunların listesi, kişisel veri uyarısı, "İndir".
- "İndir" dosyayı arka planda hazırlatır. Pencere açıkken hazır olursa indirme kendiliğinden başlar. Pencere kapanırsa listenin üstünde "Dosya hazırlanıyor" kutusu durur; hazır olunca kutuda "İndir" bağlantısı çıkar. Panel içi bildirim kart 0280'de gelir.

## Dosya (CSV)

- Ortak CSV yazıcısı `cekirdek/metinler/csv.ts` (satış raporu da kullanacak, kart 0317): UTF-8 ve başında BOM (Excel Türkçe harfleri doğru açsın), satır sonu CRLF, tırnak kaçışı.
- Ayraç sitenin para biçiminden: ondalık ayırıcı virgülse ";", değilse ",". Excel sütunları bölgesel ayara göre böler; Türkçe Excel ";" bekler.
- Tutar sayı olarak, binlik ayırıcısız, sitenin ondalık ayırıcısıyla ("1234,50"); Excel sayı olarak okur. Tarih sitenin saat diliminde "2026-11-27 14:05".
- Formül hücresi etkisiz: metin hücresi `=`, `+`, `-`, `@`, sekme ya da satır başıyla başlıyorsa başına `'` konur. Tutar hücreleri bizim ürettiğimiz sayılardır, dokunulmaz.
- Sütunlar (her sipariş bir satır): sipariş no, tarih, durum, ödeme yöntemi, müşteri adı, e-posta, telefon, teslimat adresi (açık adres, ilçe, il, posta kodu, ülke), fatura türü, fatura adı ya da unvanı, vergi dairesi ve numarası, fatura adresi, ara toplam, kupon kodu, kupon indirimi, kargo, oran oran vergi (sitede geçen her oran ayrı sütun), vergi toplamı, toplam, para birimi, kargo firması, takip no, fatura no, fatura tarihi.
- Her ürün bir satır: siparişin sütunları her satırda tekrarlanır, ek olarak ürün adı, seçim, stok kodu, adet, birim fiyat, satır tutarı, kupon payı, vergisiz, vergi.
- Kişisel bilgisi silinmiş siparişte (karar 0145) kişisel sütunlar boştur (ad, e-posta, telefon, açık adres, posta kodu, fatura adı, vergi bilgileri); il, ilçe, ülke ve tutarlar kalır (temizlik de bırakır).
- Başlıklar ve durum ile yöntem adları sitenin dilindeki metinlerdir (`tr.json`).

## Arka plan ve saklama

- Tablo `siparis_disa_aktarmalari`: kimlik, yönetici, durum (hazırlanıyor, hazır, hatalı), kapsam (listenin süzgeçleri ve aranan metin ya da seçilen sipariş kimlikleri), satır düzeni, sipariş ve satır sayısı, dosya, zamanlar.
- İş `siparis-disa-aktarma`: siparişler 500'lük partilerle okunur, dosya parça parça kurulur (bütün sipariş bellekte tutulmaz). Sınır: bir dosyada en çok 50.000 sipariş (kayıtta); aşan istek "çok büyük" hatası alır, süzgeç daraltılır.
- Dosya kişisel veri taşır: hazırlandıktan 24 saat sonra kaydıyla birlikte silinir (günlük temizlik). Dosyayı yalnız hazırlayan indirir.
- Kayıt: her indirme değişiklik kaydına `siparis.disa-aktarildi` ile girer (kişisel veri çıkışı): kapsam, satır düzeni, sipariş sayısı; dosyanın içeriği ve kişisel veri girmez.

## Uçlar

`siparisler-disa-aktar` (POST, başlatır), `siparisler-disa-aktarma` (GET, durum; kimliksiz yöneticinin sonuncusu), `siparisler-disa-aktarma-indir` (GET, dosya, `text/csv`, ekli dosya adı, `private, no-store`). Hepsi `siparis.gor`. Uç belgesine ve erişim testine girer.

## Testler

- Gerçek veritabanıyla: süzgeçlerin (tarih, durum, ödeme, kargo firması, arama, bakılacak) dosyaya listeyle aynı siparişleri vermesi, seçilen siparişler, tutarların siparişle kuruşu kuruşuna aynı olması (kupon ve iki oranlı vergi dahil), iki satır düzeni, kişisel bilgisi silinmiş sipariş, formül hücresi, ayraç ve ondalık (iki para biçimi), sınır, yalnız hazırlayanın indirmesi, değişiklik kaydı, temizlik, iki site.
- CSV yazıcısının birim testi (kaçış, formül, BOM, ayraç).
- Uçlar gerçek istekle: izin (`siparis.gor`), başka yöneticinin dosyası, girişsiz ve müşteri.
- jsdom: pencerenin seçenekleri, seçim yokken "seçili" seçeneğinin olmaması, hazırlanıyor ve hazır hâli.
- Tarayıcıda: klavyeyle pencere, indirme ve indirilen dosyanın içeriği; pencere ve hazırlanıyor kutusu iki renkte ve üç genişlikte tarama.
- Bilerek bozma, taslakla karşılaştırma, bağımsız kontrol.

## Sınırlar

İçe aktarma yok. Satış raporunun kendisi kart 0317'de; bu kart yalnız ortak CSV yazıcısını kurar.
