# 0243 · Kartla iadenin gerçek deneme ortamında ölçümü

## Amaç

Kart 0235'in kartla iadesi yalnız yerel sahte kuruluşla denendi (karar 0147, kullanıcı kararı: şimdilik ölçme). Gerçek iyzico deneme ortamında bir kez elle ölçülmeli.

## Olmazsa olmazlar

- Ödeme sonucunun `itemTransactions` alanlarının (itemId, paymentTransactionId, paidPrice) kodun okuduğu adlarla geldiği, taksitli ödemede kalemlerin ödenen toplamının ödenen tutara eşit olduğu.
- `/payment/refund` ile kalem kalem kısmi iade, aynı kalemin kalanını aşan iadenin reddi ve hata kodu, `/v2/payment/refund` ile ödeme kimliğiyle iade.
- Günlük raporda iadenin `REFUND` satırı olarak, gönderilen `conversationId` ile göründüğü (taramanın dayanağı).
- Aynı gün iade ile ertesi gün iadenin farkı (varsa).
- Bulunan her fark sahte kuruluşa ve koda işlenir.

## Sınırlar

- Canlı ortamda gerçek para iade edilmez.

## Bitti sayılır

- Ölçüm yapıldı, sonuçlar karar 0147'nin yerine geçen ya da onu tamamlayan bir kayda yazıldı.

## Durum

yapılacak
