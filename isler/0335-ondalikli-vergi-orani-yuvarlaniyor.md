# 0335 · Ondalıklı vergi oranı tam sayıya yuvarlanarak yazılıyor

## Amaç

Vergi oranları milyonda bir olarak saklanır ve ondalıklı oran girilebilir (örnek sitede %0,5 "Ek" oranı var). Oranı yazan yerler biçimleyicinin `yuzde` işlevini kullanır; o işlev tam sayıya yuvarlar (`maximumFractionDigits: 0`). %8,5'lik oran "%9", %0,5'lik oran "%1" yazılır; %9 da varsa iki satır aynı adı taşır. Kart 0317'nin bağımsız kontrolü buldu (kod okuyarak, ölçülmedi).

Yerleri: satış raporunun özet tablosu ve CSV'si (`cekirdek/yonetim-paneli/raporlar/veri.ts`, `cekirdek/moduller/rapor/csv.ts`), sipariş e-postası (`cekirdek/moduller/siparis/eposta-icerigi.ts`), siparişlerin dışa aktarmasının vergi sütunları (`cekirdek/moduller/siparis/disa-aktarma.ts`). Başka yerde de olabilir: oranı yazan her çağrı aranır.

## Olmazsa olmazlar

- Önce ölçülür: ondalıklı oranlı sitede bu yerlerin yazdığı oran.
- Oran tek bir biçimleyici işleviyle, gereken ondalıkla yazılır (sitenin dilinin biçimiyle); yeri gelen her çağrı onu kullanır.

## Sınırlar

- Vergi hesabı ve saklanan oran değişmez.

## Bitti sayılır

- %8,5 ve %0,5 oranlı sipariş her yerde doğru yazılır; testle, eski kodda kırmızı.

## Durum

yapılacak
