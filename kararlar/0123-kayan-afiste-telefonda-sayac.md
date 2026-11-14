# 0123 · Kayan afişte telefonda noktaların yerine sayaç

## Tarih

2026-11-14

## Karar

Kayan afişin (slider) slayt noktaları tablet ve üstünde 44 × 44 px basılır. Telefonda noktalar görünmez, yerlerinde "1 / 3" sayacı durur. Telefonda slaytlar arasında önceki ve sonraki düğmeleriyle (44 px) geçilir. Sayaç ekran okuyucudan gizlidir, çünkü etkin slaytın adı aynı yazıyı söyler. Kullanıcı kararıdır (kart 0191).

Aynı gerekçeyle (denetimler tek satırda kalsın) beş ya da daha çok slaytlı afişte tablet ve üstünde de sayaç durur: noktalar en çok dört slaytta görünür (`noktaSiniri`). Bu sınırı bağımsız kontrolün bulgusu üzerine teknik karar olarak koyduk.

## Neden

Proje kuralı dokunulan her öğenin parmakla rahat basılmasını ister (44 px, `.claude/rules/telefon-gorunumu.md`). Noktalar 32 px genişlikteydi. 44 px yapılınca denetim satırı (durdur, önceki, noktalar, sonraki) 320 px telefonda üç slaytla 276 px tutuyor, ama yer 254 px; satır ikiye iniyordu (ölçüldü). Slayt sayısı arttıkça daha geniş telefonlarda da inerdi. Sayaç her genişlikte tek satırda kalır ve kuralı bozmaz. Tablette de altı slaytta "görsel arkada" görünümünün kutusunda (400 px) satır 408 px tutuyor, "yazı solda" görünümünde beş ve altı slayt 768–900 px'te iki satıra iniyordu (ölçüldü); dört slayt iki görünümde de sığar.

## Düşünülen diğer yollar

- **Noktalar her yerde 44 px:** Dar telefonda denetimler iki satıra iner, slayt sayısı arttıkça daha geniş ekranlarda da.
- **Noktalar 32 px kalsın:** Aynı işi gören önceki ve sonraki düğmeleri 44 px olduğu için standart (WCAG 2.5.8) karşılanırdı. Ama proje kuralına istisna açılırdı.

## Sonuçları

- Telefonda belirli bir slayta tek dokunuşla atlanamaz, önceki ve sonraki düğmeleriyle gezilir. Slayt sayısı çoksa bu yavaştır.
- Görünüş telefonda değişir: noktalar yerine yazı. Tema bu yazıyı denetimlerin rengiyle çizer.
- Tablette noktaların arası açılır (32 px'ten 44 px'e). Beş ve daha çok slaytta noktalar hiçbir genişlikte görünmez.
