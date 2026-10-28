# 0015 · Klasör düzeni ve adlandırma

## Tarih

2026-10-28

## Karar

- Projenin klasör düzeni `.claude/rules/klasor-duzeni.md` dosyasında yazan ağaçtır. Kök klasörler şunlardır: `cekirdek/`, `bilesenler/`, `sahip-paneli/`, `komutlar/`, `siteler/`, `sunucu/`. Hafıza ve kural klasörleri olduğu gibi kalır.
- Dosya, klasör, tablo ve alan adları Türkçe yazılır ve yalnız İngiliz alfabesinin harflerini kullanır (`siparis`, `odeme`, `yasal-metinler`).
  - Dosya ve klasör adları küçük harfle ve tireyle yazılır: `arka-plan-isleri`.
  - Tablo ve alan adları küçük harfle ve alt çizgiyle yazılır: `siparis_kalemleri`, `olusturma_zamani`.
  - Kodun içindeki adlar TypeScript alışkanlığına uyar: değişkenler `siparisNumarasi`, bileşen ve türler `UrunKarti` biçiminde.
- Araçların zorunlu tuttuğu adlar değiştirilmez: `app/`, `page.tsx`, `layout.tsx`, `route.ts`, `public/`, `package.json`, `*.config.*`, `Dockerfile` gibi.
- Vitrin ve panel adresleri Türkçedir: `/sepet`, `/odeme`, `/yonetim/siparisler`. Kapının adresleri dört girişe göre başlar: `/kapi/herkese-acik/`, `/kapi/musteri/`, `/kapi/yonetici/`, `/kapi/sahip/`.

## Neden

- Planlar, kararlar ve terim sözlüğü Türkçe. Kodda da aynı sözcükler kullanılınca bir kavramın planda ve kodda ayrı iki adı olmaz (`.claude/rules/klasor-duzeni.md`: tek adlandırma biçimi).
- Türkçe harfler bazı araçlarda, adreslerde ve dosya sistemlerinde sorun çıkarır. Yalnız İngiliz alfabesiyle yazmak bunu önler.
- Kurallar dosya yollarına bağlı (`paths`). Klasörler sabitlenince her kural doğru dosyada devreye girer.

## Düşünülen diğer yollar

- Kod adlarını İngilizce yazmak: Seçilmedi. Kütüphane alışkanlıklarına daha yakın olurdu, ileride gelecek bir yazılımcıya da tanıdık gelirdi. Ama her kavramın planda Türkçe, kodda İngilizce iki adı olurdu ve bu iki ad zamanla ayrışırdı.
- Türkçe harflerle yazmak (`sipariş`): Seçilmedi. Bazı araçlar ve adresler bu harfleri bozar.

## Sonuçları

- Kütüphanelerden gelen adlar İngilizce kalır, kodda iki dil yan yana görünür. Bu yalnız araçların kendi adları için geçerlidir, bizim yazdığımız her ad Türkçedir.
- Kural dosyalarının `paths` satırları bu düzene göre yazıldı. Düzen değişirse onlar da aynı değişiklikte güncellenir.
- `planlar/cekirdek-ve-siteler.md` ve `planlar/komutlar.md` dosyalarındaki "klasör adları örnektir" notları kapanır.
