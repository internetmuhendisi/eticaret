# 0195 · Satış raporu ve raporların sayma kuralı

## Tarih

2026-11-27

## Karar

Panelin Raporlar ekranı satış raporuyla açılır (kart 0317; taslak `planlar/tasarim-yonu/panel-2.html`, karar 0185). Kullanıcının kararları:

- Raporları yalnız mağaza sahibi görür: yeni izin `rapor.gor`, hazır sınırlı rollerin (görevli, sipariş görevlisi, içerik editörü) hiçbirinde yoktur.
- Satış ödemenin alındığı günde sayılır (`odeme_zamani`: kartla ödemede sipariş kurulurken, havalede onayda, kapıda ödemede teslimde, "elden"de girilirken). İade, tamamlandığı günde düşülür (`sonuc_zamani`).
- Çok satanlar listesi ürün raporundadır (kart 0318), satış raporunda yoktur.

Teknik kararlar:

- Sayma kuralı tek yerdedir (`cekirdek/moduller/rapor/satis.ts`): satış ödemesi alınmış siparişlerin saklanan toplamıdır (kupon düşülmüş, kargo ve vergi dahil, taksit farkı hariç). Ödenmeden iptal edilen siparişin ödeme anı olmaz, hiç sayılmaz. Ödendikten sonra iptal edilen sipariş ödeme gününde satış, iptal gününde iadedir: geçmiş günün rakamı sonradan değişmez. Bir siparişin iadeleri toplamını aşmaz (taksitli tam iade taksit farkını da döndürür, aşan kısım sayılmaz; müşteri listesiyle aynı kural). Yalnız sitenin para birimi sayılır. Vergi oran oran satışların dökümünden iadelerin dökümü çıkarılarak bulunur; sıfırlanan oran satırı gösterilmez. Ürün, müşteri ve kupon raporları (kart 0318) ve panodaki satış özeti (kart 0186) bu servisi kullanır.
- Dönem adreste durur (`?donem=son-30-gun` ya da `?donem=2026-10-01_2026-10-31`, `&karsilastir=0`). Hazır dönemler: bugün, son 7 gün, son 30 gün, bu ay, geçen ay (`cekirdek/kayitlar/rapor.ts`). Özel aralıkta iki gün de zorunludur, en çok 366 gün. Günler sitenin saat dilimindedir, sınırları sipariş listesinin tarih süzgeciyle aynı işlevle çevrilir (`gununBasi`, kart 0267). Geçersiz dönem sitenin varsayılan dönemine düşer (`raporVarsayilanDonem`, varsayılan son 30 gün, karar 0185). Önceki dönem aynı uzunlukta, hemen önceki günlerdir; karşılaştırma varsayılan açıktır.
- Seri 31 güne kadar günlük, daha uzun dönemde dönemin ilk gününden yedişer günlüktür. Grafik çizimin kendi oranıyla kabı doldurur (ölçekte grafik boyu yoktur), tablo karşılığı ekran okuyucuya her zaman açıktır.
- CSV siparişleri dışa aktarmanın ortak yazıcısıyla (karar 0194) yazılır. Kartın "makinece okunur" dediği tutar o kararın biçimidir: simgesiz, binlik ayırıcısız, sitenin ondalık ayırıcısıyla (Türkçe Excel'in sayı olarak okuduğu "1234,50"); günler "YYYY-AA-GG". Dosya ekranla aynı işlevden kurulur: dönem, özet (önceki dönemle), oran oran vergi, seri. İstek küçüktür, arka plana gitmez; uç dosyayı hemen verir (`rapor-satis-csv`).
- Sorgu hızı ilk yılın en büyük mağazası ölçeğinde, 100 bin siparişte ölçüldü (iki yıla yayılmış, %90'ı ödenmiş, %3 iade; kart 0298'in yöntemi, yerelde, yedi çalışmanın ortancası): iki kısmi indeksle (`siparisler_odeme_zamani`, `siparis_iadeleri_tamamlanan`, değişiklik 0068) bugün 28 → 5 ms, son 30 gün 55 → 13 ms; bir yıllık rapor indeksle de indekssiz de 80–113 ms (tabloyu tarar). İndeks panodaki kısa dönem için eklendi.

## Neden

- Ciro ve iade ticari bilgidir; görevlinin işi için gerekmez. İzin ayrı olduğu için sonradan rapor görebilen bir rol eklemek kolaydır.
- Ödeme gününde saymak paranın geldiği günü gösterir ve geçmiş günün rakamını sabit tutar; kapıda ödeme ödenmeden ciroya girmez.
- Çok satanların iki raporda yazılması aynı tablonun iki kopyası olurdu.
- Kuralın tek yerde olması dört raporun ve panonun aynı sayıyı vermesini sağlar.

## Düşünülen diğer yollar

- **Raporu görevliye ve sipariş görevlisine de açmak:** Ticari bilgi gereksiz yere yayılırdı. Seçilmedi (kullanıcı kararı).
- **Siparişi verildiği günde saymak:** Havale ödendikçe ya da süresi dolup iptal oldukça geçmiş günlerin rakamı değişirdi. Seçilmedi (kullanıcı kararı).
- **İptal edilen siparişi ciroya hiç katmamak:** Ödendikten sonra iptal edilen sipariş geçmiş günün cirosunu sonradan düşürürdü. İade gününde düşmek geçmişi sabit tutar.
- **CSV'de nokta ondalıklı tutar:** Türkçe Excel onu sayı olarak okumaz; siparişlerin dosyasıyla da tutarsız olurdu (karar 0194).
- **Ayrı JSON veri ucu:** Sayfa veriyi sunucuda servisle okur; kullanan olmayan uç yazılmadı. Pano (kart 0186) aynı servisi sunucuda çağırır.

## Sonuçları

- Ekran taslaktan şu yerlerde ayrılır: CSV bağlantısı komut çubuğunda "Dışa aktar" adıyladır (panelin kuralı: dışa aktarma eylemi komut çubuğunda, `disa-aktar` eylemi); Ürünler, Müşteriler ve Kuponlar sekmeleri kart 0318 ile gelir; özel aralığın günleri zorunludur (taslakta isteğe bağlı yazıyordu); tek gün ve iki yıla yayılan dönem uzun tarihle yazılır.
- Önceki dönem sıfırken yüzde yazılmaz, yalnız önceki değer yazılır. Fark mağaza için iyiyse yeşil, kötüyse kırmızıdır (iadede azalış iyidir); anlamı okla ve yazıyla da verilir.
- Rapor satış tarihine bağlı geçmişi değiştirmez; buna karşılık ödenmemiş siparişi hiç göstermez (bekleyen havale ayrı listede, siparişlerin "ödeme bekleniyor" sekmesindedir).
- Taksit farkı satışta yoktur, iadede aşan kısmı sayılmaz: kuruluşun ödediği taksit farkı raporda görünmez.
- Varsayılan dönem ayarının panelde değiştirildiği yer yoktur (kart 0334); başlangıç değeri site ayarından gelir.
- İade sorgusunda dönemde tamamlanmış iadesi olan siparişleri seçen ilk koşul yalnız sorguyu daraltır (indeks için); doğruluk ikinci koşuldan gelir, ilk koşul tek başına bozulunca test yeşil kalır.
