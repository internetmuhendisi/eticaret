# 0017 · Kod denetimi ve biçim Biome ile

## Tarih

2026-10-28

## Karar

- Kod biçimi ve kod denetimi tek araçla, Biome ile yapılır. Sürümü kökteki `package.json` dosyasında tam sürümle sabitlenir, şu an 2.6.3. Ayar kökteki `biome.json` dosyasındadır.
- Projeye özel yasaklar (ham renk, ekrana gömülü metin, güvensiz sorgu) Biome'un Grit eklentileriyle yazılır ve kökteki `denetim/kurallar/` klasöründe durur. Her yasağın bilerek bozulmuş örneği `denetim/bozuk-ornekler/` klasöründedir.
- Kayıt (commit) öncesinde `pnpm denetim` çalışır, kırmızıysa kayıt durur. Kontrolü `simple-git-hooks` aracı kurar, `pnpm install` sırasında kendiliğinden kurulur. Aracın kendi kurulum betiği kapalıdır (`pnpm-workspace.yaml`, `allowBuilds`), kurulumu projenin kendi `prepare` betiği yapar.
- Komutlar: `pnpm denetim`, `pnpm bicimle`, `pnpm denetim-kendi-testi`. Ayrıntı: `.claude/rules/kurallari-koruyan-kontroller.md`.

## Neden

- Proje TypeScript 7 kullanıyor (karar 0016). ESLint'in TypeScript eklentisi (typescript-eslint 8.72.1) yalnız 6.1'den eski TypeScript sürümlerini destekliyor. Biome kendi ayrıştırıcısıyla çalıştığı için TypeScript sürümüne bağlı değil.
- Biçimlendirme ve denetimin tek araçta olması iki aracın ayarlarının birbirine karışmasını önler ve kontrolü hızlı tutar.
- Gerekli dört yasağın dördü de Biome ile kurulabildi ve her biri bozuk örneğiyle denendi.
- `simple-git-hooks` ek program indirmeyen küçük bir araçtır, ayarı `package.json` içinde tek satırdır.

## Düşünülen diğer yollar

- ESLint ve Prettier: Seçilmedi. En yaygın yol ve özel kural yazmak daha kolay, ama TypeScript eklentisi TypeScript 7'yi desteklemiyor. TypeScript 5 serisine dönmek, yalnız denetim aracı için tür kontrolünü eski sürüme bağlamak olurdu.
- Oxlint: Seçilmedi. Hızlı ve TypeScript'e bağlı değil, ama biçimlendirici içermiyor. Özel kurallar için ayrıca deneysel bir eklenti desteği gerekiyordu.
- Lefthook ya da Husky: Seçilmedi. İkisi de işi görür, ama Lefthook ayrı bir program indiriyor, Husky ise burada gerek olmayan ek dosyalar getiriyor.

## Sonuçları

- Biome'un Grit eklentileri ESLint kurallarından daha sınırlı. Örneğin bir sorgu önce bir değişkende kurulup sonra çağrıya verilirse güvensiz sorgu kuralı onu yakalamaz. Bu sınırlar kural dosyalarının başında yazılıdır.
- Grit düzenli ifadelerinde parantez değişken sayılır. Gruplar `(?:...)` ile yazılmalıdır, yoksa kural sessizce hiçbir şey yakalamaz. Bu yüzden her kuralın bozuk örneği zorunludur.
- Kayıt öncesi kontrol git'in ortak kontrol klasörüne kurulur. Bütün çalışma kopyaları aynı kontrolü kullanır.
- Kayıt öncesi kontrol, kayda girmeyen dosyaları da denetler. Çalışma kopyasında kayda girmeyecek bozuk bir dosya varsa kayıt yine durur.
- Kayıt öncesi kontrol, gerekirse `git commit --no-verify` ile atlanabilir. Bu yüzden asıl koruma, yayın öncesi kontrol hattındaki aynı denetimdir (kart 0017).
