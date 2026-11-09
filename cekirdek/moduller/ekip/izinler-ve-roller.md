# İzinler ve roller

Kuralları `.claude/rules/yetki.md`, gerekçeleri karar 0040'tadır. Yeni izin ya da rol aynı değişiklikte buraya yazılır. Listelerin kayıtla aynı olduğunu `cekirdek/moduller/ekip/testler/belge.test.ts` denetler.

**Kapsam.** `kendi`: hesabın kendi kayıtları. `ekip`: hesabın ekibinin kayıtları; mağazada henüz alt ekip yapısı olmadığı için bu kapsamı kullanan izin yoktur. `tumu`: sitenin bütün kayıtları.

## İzinler

| İzin | Giriş | Kapsam | Ne verir |
|---|---|---|---|
| `duzen.gor` | yonetici | tumu | Vitrinin düzenini (üst kısım, ana sayfa, alt kısım bölümleri) görür. |
| `duzen.degistir` | yonetici | tumu | Bölüm ekler, değiştirir, gizler, sıralar ve siler. |
| `ekip.kendi-hesabi.gor` | yonetici | kendi | Yönetici kendi hesabını görür. |
| `ekip.gor` | yonetici | tumu | Ekipteki bütün yöneticileri görür. |
| `ekip.rol-ata` | yonetici | tumu | Yöneticilere rol verir ve alır. |
| `etiket.gor` | yonetici | tumu | Etiketleri ve ürünlerini görür. |
| `etiket.degistir` | yonetici | tumu | Etiket ekler ve değiştirir. |
| `etiket.sil` | yonetici | tumu | Etiket siler: ürünlerden kalkar. |
| `fiyat.gor` | yonetici | tumu | Satılabilir birimlerin fiyatlarını ve fiyat geçmişini görür. |
| `fiyat.degistir` | yonetici | tumu | Satış fiyatını ve indirimi değiştirir. |
| `kategori.gor` | yonetici | tumu | Kategorileri ve ürünlerini görür. |
| `kategori.degistir` | yonetici | tumu | Kategori ekler, değiştirir ve taşır. |
| `kategori.sil` | yonetici | tumu | Kategori siler: altındakiler bir üste çıkar, ürün bağlantıları kalkar. |
| `magaza-ayarlari.gor` | yonetici | tumu | Mağaza sahibinin ayarlarını görür. |
| `magaza-ayarlari.degistir` | yonetici | tumu | Mağaza sahibinin ayarlarını değiştirir. |
| `marka.gor` | yonetici | tumu | Markaları ve ürünlerini görür. |
| `marka.degistir` | yonetici | tumu | Marka ekler ve değiştirir. |
| `marka.sil` | yonetici | tumu | Marka siler: ürünlerden kalkar. |
| `menu.gor` | yonetici | tumu | Menüleri ve öğelerini, hedefi silinmiş öğelerin işaretiyle görür. |
| `menu.degistir` | yonetici | tumu | Menü ve öğe ekler, değiştirir, sıralar ve siler. |
| `musteri.kendi-hesabi.gor` | musteri | kendi | Müşteri kendi hesabını görür. |
| `ozellik.gor` | yonetici | tumu | Ürün özelliklerini ve seçeneklerini görür. |
| `ozellik.degistir` | yonetici | tumu | Özellik ve seçenek ekler ve değiştirir. |
| `ozellik.sil` | yonetici | tumu | Özellik ya da seçenek siler: değerleri ürünlerden kalkar. |
| `stok.gor` | yonetici | tumu | Satılabilir birimlerin stoğunu ve stok geçmişini görür. |
| `stok.duzelt` | yonetici | tumu | Stoğu sebebiyle elle düzeltir. |
| `tema.gor` | yonetici | tumu | Sitenin temasını, tema ayarlarını ve tema sürümlerini görür. |
| `tema.degistir` | yonetici | tumu | Temayı ve tema ayarlarını yayınlar, önceki bir tema sürümüne döner. |
| `urun.gor` | yonetici | tumu | Ürünleri, silinmişler dahil, görür. |
| `urun.degistir` | yonetici | tumu | Ürün ekler ve değiştirir. |
| `urun.sil` | yonetici | tumu | Ürün siler (silinmiş olarak işaretler). |
| `vergi.gor` | yonetici | tumu | Vergi sınıflarını ve oran tablosunu görür. |
| `vergi.degistir` | yonetici | tumu | Vergi sınıflarını ve oranlarını ekler, değiştirir ve siler. |

Müşterinin rolü yoktur: geçerli oturumu olan her müşteri müşteri girişinin izinlerine sahiptir, kapsamı yalnız kendi kayıtlarıdır. Sahip girişinin izni sahip paneliyle gelir.

## Roller

Her sitede hazır gelir. Ekranda görünen adları metin dosyasındadır (`yonetim.rol`).

| Kod | Görünen ad | İzinler |
|---|---|---|
| `magaza-sahibi` | Mağaza sahibi | bütün yönetici izinleri |
| `gorevli` | Görevli | ekip.kendi-hesabi.gor, urun.gor, urun.degistir, kategori.gor, kategori.degistir, marka.gor, marka.degistir, etiket.gor, etiket.degistir, fiyat.gor, stok.gor, stok.duzelt, ozellik.gor, ozellik.degistir |

Tam yetkili son yöneticinin rolü alınamaz. Görevlinin izinleri ürün ve sipariş gibi modüller geldikçe artar.
