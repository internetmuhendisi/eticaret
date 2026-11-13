# 0118 · Ürün sayfasında müşterinin seçtiği değer sessizce değişmez

Bu kararın kural ve satır maddelerinin yerine 0119 numaralı karar geçti.

## Tarih

2026-11-14

## Karar

**Kullanıcı kararı:** Müşterinin elle seçtiği değer korunur. Basic Tişört'te Beyaz, sonra M seçilince M Beyaz tükenmiş olsa da Beyaz seçili kalır; tükenmiş değer seçilebiliyorsa (stoğa gelince haber ver eklentisi açık, karar 0117) sayfa "Tükendi" der ve haber ver kutusunu gösterir.

- **Kural (`secimiDegistir`, `cekirdek/vitrin/urun-sayfasi/secim.ts`):** Bir seçenek değişince sonraki seçeneklerde önce müşterinin o seçenekte elle seçtiği son değer, o yoksa seçili değer denenir. Tükenmiş değer seçilebiliyorsa birleşimi olan (tükenmiş de olsa) aday kalır; seçilemiyorsa yalnız satılabilir aday kalır. Aday kalmazsa ilk satılabilir değere, o da yoksa (tükenmiş değer seçilebiliyorsa) birleşimi olan ilk değere geçilir.
- **Söylenmesi (`degisenSecimler`):** Sonraki bir seçenekte müşterinin seçtiğinden başka bir değere geçildiyse (eklenti kapalıyken tükenmiş değer ya da o seçimle hiç olmayan değer) stok bölgesinde bir satır yazar ve ekran okuyucuya duyurulur: "Beden: M bu seçimle tükendi, S seçildi." ya da "... bu seçimle bulunmuyor, ...". Önceki seçimde de başka değerdeyse yeniden söylenmez; sonraki seçimde satır kalkar.

Karar 0108'in sonraki seçeneklerin satılabilir değere geçtiği maddesinin ve karar 0117'nin "sonraki seçeneklerde önce satılabilir değer aranır" maddesinin yerine geçer.

## Neden

- Müşteri gezisinde (2026-11-13) ölçüldü: Beyaz, sonra M seçen müşteri sayfada M Siyah'ı ve siyah tişört görselini görüyordu. Değişiklik tek bir yazıyla (seçenek başlığındaki "Renk: Siyah") belli oluyordu; müşteri beyaz istediğini sanırken siyahı seçmiş olurdu. Tükenmiş bedeni haber için seçebilme kararı (0117) da bu yolda işe yaramıyordu: müşteri haber ver kutusunu hiç görmüyordu.
- Eklenti kapalıyken tükenmiş değer seçilemez (karar 0108); orada geçiş kaçınılmazdır, ama müşteri değişikliği duymalıdır.

## Düşünülen diğer yollar

- **Renk değişsin ama söylensin (eklenti açıkken de):** Kullanıcı seçmedi. Müşterinin istediği birleşim tükenmişse onu göstermek ve haber vermeyi önermek, başka bir birleşime geçirmekten daha doğrudur.
- **Seçim değişince sonraki seçimleri temizlemek:** Müşteri her renk değişikliğinde bedeni yeniden seçerdi; seçilmedi.

## Sonuçları

- Eklenti açık sitede müşteri renk ya da beden değiştirirken tükenmiş birleşimde kalabilir; "Tükendi" ve haber ver kutusu görünür, satın alma (sepet geldiğinde) o birleşimde kapalıdır. Satılabilir başka değer seçmek müşterinin elindedir.
- Eklenti kapalı sitede davranış aynıdır, yalnız geçiş artık söylenir.
- Birim (`secim.test.ts`), jsdom (`urun-ust.test.tsx`) ve tarayıcı testi (`urun-sayfasi.test.ts`) yeni kuralı ölçer; eski kuralla kırmızıdır.
