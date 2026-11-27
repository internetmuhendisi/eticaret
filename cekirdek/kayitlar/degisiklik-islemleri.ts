// Değişiklik kaydına yazılan işlemlerin tek kaydı (kart 0029, karar 0045). Kod bir kez yayınlandıktan
// sonra adı değişmez: eski kayıtlar bu adı taşır. Fiyat, stok ve sipariş kendi modülleriyle eklenir.
export const degisiklikIslemleri = [
  "rol.verildi",
  "rol.alindi",
  "yonetici.kapatildi",
  "yonetici.sifre-sifirlandi",
  // Mağaza sahibinin ayarı veritabanına ilk kez başlangıç değeriyle yazıldı (kart 0069).
  "magaza-ayari.baslangic",
  "magaza-ayari.degisti",
  // Vergi sınıfı ya da oranı sitenin başlangıç verisinden ilk kez yazıldı (kart 0074).
  "vergi.baslangic",
  "vergi-sinifi.eklendi",
  "vergi-sinifi.degisti",
  "vergi-sinifi.silindi",
  "vergi-orani.eklendi",
  "vergi-orani.degisti",
  "vergi-orani.silindi",
  // Kargo ücretinin vergi sınıfı değişti (kart 0075).
  "vergi.kargo-sinifi",
  // Ürün ve satılabilir birimi (kart 0076).
  "urun.eklendi",
  "urun.degisti",
  "urun.silindi",
  // Kart 0320: ürün kopyalandı; yeni ürünün kaydı, değerinde kaynak ürün.
  "urun.kopyalandi",
  // Önerilen sıralama (kart 0136): mağaza sahibinin elle sırası, tek genel sıra.
  "urun.vitrin-sirasi",
  // Varyantlı ürünün seçenekleri, değerleri ve birleşimleri (kart 0085). Değeri silinen birleşim de
  // kendi satırıyla urun-birimi.silindi olarak yazılır.
  "urun-secenegi.eklendi",
  "urun-secenegi.degisti",
  "urun-secenegi.silindi",
  "urun-secenek-degeri.eklendi",
  "urun-secenek-degeri.degisti",
  "urun-secenek-degeri.silindi",
  "urun-birimi.eklendi",
  "urun-birimi.degisti",
  "urun-birimi.silindi",
  // Ürün galerisi (kart 0087): öğe eklendi, alternatif metni değişti, silindi; sıralama ürünün
  // kaydına yazılır (kayıt türü urun). Silinen öğeyi seçmiş birleşimin görseli urun-birimi.degisti
  // olarak yazılır.
  "urun-galerisi.eklendi",
  "urun-galerisi.degisti",
  "urun-galerisi.silindi",
  "urun-galerisi.siralandi",
  // Kategori (kart 0077). Taşıma, üst kategorinin değişmesidir: kategori.degisti.
  "kategori.eklendi",
  "kategori.degisti",
  "kategori.silindi",
  // Marka ve etiket (kart 0078).
  "marka.eklendi",
  "marka.degisti",
  "marka.silindi",
  "etiket.eklendi",
  "etiket.degisti",
  "etiket.silindi",
  // Ürün özelliği ve liste türündeki seçenekleri (kart 0086). Ürünün değerleri urun.* ile yazılır;
  // silinen özelliğin ya da seçeneğin değerlerinin kalktığı ürünler silme kaydında listelenir.
  "ozellik.eklendi",
  "ozellik.degisti",
  "ozellik.silindi",
  "ozellik-secenegi.eklendi",
  "ozellik-secenegi.degisti",
  "ozellik-secenegi.silindi",
  // Satılabilir birimin fiyatı (kart 0080). İlk fiyatta eski değer boştur.
  "fiyat.degisti",
  // Fiyat girişi (vergi dahil ya da hariç) değişti, kayıtlı tutarlar çevrildi (kart 0326, karar 0201). Kayıt kimliği
  // fiyat girişi geçmişinin satırıdır; fiyatlar, kuponlar ve ayarlar ayrıca kendi kayıtlarıyla girer.
  "fiyat-girisi.degisti",
  // Satılabilir birimin stoğu panelden elle düzeltildi (kart 0082). Siparişin düşürmesi ve iptalin
  // artırması yalnız stok geçmişine yazılır.
  "stok.duzeltildi",
  // Sitenin tema sürümü (kart 0105): başlangıç değeriyle ilk sürüm, mağaza sahibinin yayını ve önceki bir
  // sürüme dönüş. Kayıt kimliği yeni sürümün kimliğidir.
  "tema.baslangic",
  "tema.yayinlandi",
  "tema.geri-donuldu",
  // Sitenin düzeni (kart 0106): başlangıç düzeniyle ilk sürüm ve bölüm işlemleri. Kayıt kimliği yeni düzen
  // sürümünün kimliğidir; değerlerde bölümün kimliği ve türü yazar.
  "duzen.baslangic",
  "duzen.bolum-eklendi",
  "duzen.bolum-degisti",
  "duzen.bolum-gizlendi",
  "duzen.bolum-gosterildi",
  "duzen.bolumler-siralandi",
  "duzen.bolum-silindi",
  // Tema değişikliğinin düzeni (kart 0113): yeni temanın düzeni uygulandı ya da düzen korunup görünümü
  // olmayan bölümler varsayılana düştü; tema kodu değişen geri dönüşte önceki düzen getirildi. Tema
  // sürümünün kaydıyla aynı işlemde yazılır; değerlerde düzen sürümlerinin sırası ve yol yazar.
  "duzen.tema-degisti",
  "duzen.geri-donuldu",
  // Panelden "Önceki hâline dön" (kart 0142, karar 0115): bir önceki düzen sürümü yeni sürüm olarak yazıldı.
  // Değerlerde dönülen sürümün sırası yazar. Tema geri dönüşünün düzeninden (duzen.geri-donuldu) ayrıdır.
  "duzen.onceki-hale-donuldu",
  // Menü ve öğeleri (kart 0107). Öğenin taşınması üstünün değişmesidir: menu-ogesi.degisti. Kardeşlerin
  // sıralanması menünün kaydına yazılır. Silinen menünün ve öğenin alt öğeleri silme kaydında listelenir.
  // Başlangıç menüleri aynı işlemlerle, "baslangic-menu" adlı sistem işlemi olarak yazılır.
  "menu.eklendi",
  "menu.degisti",
  "menu.silindi",
  "menu-ogesi.eklendi",
  "menu-ogesi.degisti",
  "menu-ogesi.silindi",
  "menu-ogesi.siralandi",
  // Ürün yorumu (kart 0139): müşteri yazdı (başlangıç kataloğunun örnek yorumu da), mağaza yayınladı ya da
  // reddetti, ana sayfa işareti değişti. Metin ve ad kayda girmez: müşterinin yazdığı serbest metin kişisel
  // bilgi taşıyabilir.
  "yorum.yazildi",
  "yorum.durum-degisti",
  "yorum.ana-sayfa",
  // Kart 0235: siparişin iptali ve iadesi (tutar, vergi, kalemler, neden). Durumun kendisi sipariş geçmişindedir.
  "siparis.iptal-edildi",
  "siparis.iade-edildi",
  // Kart 0236: panelden girilen sipariş (numara, toplam, ödeme yöntemi, metinlerin iletildi beyanı).
  "siparis.panelden-olusturuldu",
  // Kuponlar (kart 0312). Başlangıç kuponları aynı işlemle, "baslangic-kupon" adlı sistem işlemi olarak yazılır.
  "kupon.eklendi",
  "kupon.degisti",
  // Kart 0239: mağaza müşterinin iade talebini onayladı ya da reddetti (talep, kalemler, ret açıklaması kayda
  // girmez: müşteriye yazılan serbest metindir).
  "siparis.iade-talebi-onaylandi",
  "siparis.iade-talebi-reddedildi",
  // Kart 0268: siparişin faturası yazıldı (numara, tarih, dosyanın kimliği) ya da kaldırıldı.
  "siparis.fatura-yazildi",
  // Kart 0269: teslimat ve fatura bilgileri düzeltildi; kayda yalnız değişen alanların adları ve il, ilçe kodları girer.
  "siparis.adres-duzeltildi",
  "siparis.fatura-kaldirildi",
  // Kart 0316: siparişler dosyaya indirildi (kişisel veri çıkışı). Kayda kapsam, satır düzeni ve sipariş sayısı girer;
  // dosyanın içeriği girmez.
  "siparis.disa-aktarildi",
  // Kart 0318: müşteri raporu dosyaya indirildi (üyelerin adları; kişisel veri çıkışı). Kayda dönem ve satır sayısı
  // girer, dosyanın içeriği girmez.
  "rapor.musteriler-indirildi",
  // Kart 0279: mağaza sahibinin e-posta metni değişti ya da varsayılana döndü. Kayda metin girmez, değişen alanların
  // adı girer.
  "eposta-metni.degisti",
  "eposta-metni.varsayilana-dondu",
  // Mağazanın müşteri hakkındaki notu (kart 0271, karar 0173): metni kayda yazılmaz.
  "musteri-notu.eklendi",
  "musteri-notu.silindi",
  // Panelden müşteriye şifre sıfırlama bağlantısı gönderildi (kart 0271); e-posta kayda yazılmaz.
  "musteri.sifre-sifirlama-gonderildi",
  // Blog (kart 0272, karar 0176): yazı ve blog kategorisi. İçerik ve özet kayda girmez (uzun metin); başlık, adres
  // adı, durum, yayın zamanı, kategori ve kapak girer.
  "blog-yazisi.eklendi",
  "blog-yazisi.degisti",
  "blog-yazisi.silindi",
  "blog-kategorisi.eklendi",
  "blog-kategorisi.degisti",
  "blog-kategorisi.silindi",
  "blog-kategorisi.siralandi",
  // Sabit sayfa (kart 0273): içerik ve açıklama kayda girmez (uzun metin); başlık, adres adı ve durum girer.
  "sabit-sayfa.eklendi",
  "sabit-sayfa.degisti",
  "sabit-sayfa.silindi",
  // Ekip (kartlar 0274, 0053): yöneticinin iki aşamalı girişi sıfırlandı; yönetici kendi yedek kodlarını yeniledi
  // (kodlar kayda girmez).
  "yonetici.iki-asama-sifirlandi",
  "yonetici.yedek-kodlari-yenilendi",
  // Ekibe davet (kart 0275): davet gönderildi, geri alındı, kabul edildi (yeni yönetici yapar). E-posta kayda girmez;
  // roller girer.
  "yonetici-daveti.gonderildi",
  "yonetici-daveti.geri-alindi",
  "yonetici-daveti.kabul-edildi",
] as const;
export type DegisiklikIslemi = (typeof degisiklikIslemleri)[number];

// Değişen kaydın türü.
export const degisiklikKayitTurleri = [
  "yonetici",
  "magaza-ayari",
  "vergi-sinifi",
  "vergi-orani",
  "urun",
  // Kart 0085: varyantlı ürünün seçeneği, değeri ve satılabilir birimi.
  "urun-secenegi",
  "urun-secenek-degeri",
  "urun-birimi",
  // Kart 0087: ürün galerisinin öğesi.
  "urun-galeri-ogesi",
  "kategori",
  "marka",
  "etiket",
  // Kart 0086: ürün özelliği ve liste seçeneği.
  "ozellik",
  "ozellik-secenegi",
  // Kayıt kimliği satılabilir birimin kimliğidir (kart 0080).
  "fiyat",
  "fiyat-girisi",
  // Kayıt kimliği satılabilir birimin kimliğidir (kart 0082).
  "stok",
  // Kart 0105: sitenin tema sürümü.
  "tema-surumu",
  // Kart 0106: sitenin düzen sürümü.
  "duzen-surumu",
  // Kart 0107: menü ve menü öğesi.
  "menu",
  "menu-ogesi",
  // Kart 0139: ürün yorumu.
  "yorum",
  // Kart 0235: sipariş (iptal ve iade).
  "siparis",
  // Kart 0271: müşteri hesabı ve mağazanın müşteri hakkındaki notu.
  "musteri",
  "musteri-notu",
  // Kart 0272: blog yazısı ve blog kategorisi.
  "blog-yazisi",
  "blog-kategorisi",
  // Kart 0273: sabit sayfa.
  "sabit-sayfa",
  // Kart 0275: ekibe davet.
  "yonetici-daveti",
  // Kart 0312: kupon.
  "kupon",
  // Kart 0316: siparişlerin dışa aktarması (kayıt kimliği dışa aktarmanın kimliğidir).
  "siparis-disa-aktarma",
  // Kart 0318: raporun indirilmesi (kayıt kimliği indirmenin kendi kimliğidir).
  "rapor-indirme",
  // Kart 0279: e-posta metninin birimi (eposta_metinleri satırı).
  "eposta-metni",
] as const;
export type DegisiklikKayitTuru = (typeof degisiklikKayitTurleri)[number];

// Değişikliği kim yaptı: bir hesap ya da komut gibi hesabı olmayan bir işlem.
export type DegisikligiYapan =
  | { tur: "yonetici" | "musteri" | "sahip"; kimlik: string }
  | { tur: "sistem"; ad: string };

export const sistemIslemi = (ad: string): DegisikligiYapan => ({ tur: "sistem", ad });
