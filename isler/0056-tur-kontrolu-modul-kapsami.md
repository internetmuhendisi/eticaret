# 0056 · Tür kontrolü bütün modül dosyalarını kapsasın

## Amaç

`tsconfig.json` `cekirdek/moduller/**` klasörünü içermiyor; modül dosyaları ancak kapının içe aldığı kadarıyla denetleniyor (kart 0029'un bağımsız kontrolü, listesi aşağıda ölçülecek). Kapıya bağlı olmayan modül dosyasındaki ve modül testlerindeki tür hatası hattı kırmızıya düşürmez. Kural (`.claude/rules/test.md`) test dosyalarının da tür kontrolünden geçmesini ister.

## Olmazsa olmazlar

- `pnpm tur-kontrolu` `cekirdek/` altındaki bütün `.ts` ve `.tsx` dosyalarını denetler; dışarıda kalan klasör listeye bilerek yazılmak zorunda kalır.
- Çıkan hatalar düzeltilir.
- Bozuk bir modül dosyasının ve modül testinin kırmızıya düştüğü gösterilir.

## Sınırlar

- Tür kontrolünün ayarları sıkılaştırılmaz, yalnız kapsamı genişler.

## Bitti sayılır

- Bilerek bozulan modül dosyası ve modül testi `pnpm tur-kontrolu`'nu kırmızıya düşürüyor. Ölçüldü.
- Kapsam dışı kalan klasör testle görülüyor.

## Durum

yapılacak
