# 0027 · Çekirdeğin Docker görüntüsü

## Tarih

2026-11-04

## Karar

- **Üretim:** `pnpm cekirdek-goruntusu` görüntüyü `sunucu/cekirdek/Dockerfile` ile üretir ve hemen denetler. Etiket `altyapi-cekirdek:<sürüm>` biçimindedir. Sürüm `cekirdek/surum.ts` dosyasından (karar 0024), Node.js ve pnpm sürümleri kökteki `package.json` dosyasından (karar 0016) okunur ve görüntüye derleme argümanıyla verilir. Görüntünün adı yalnız `komutlar/cekirdek-goruntusu-denetle.mts` dosyasında yazar.
- **Yapı:** Görüntü iki aşamalıdır. Derleme aşaması bağımlılıkları kilit dosyasıyla kurar ve Next.js'i `output: "standalone"` ile derler. Çalışma aşaması yalnız derlenmiş uygulamayı (`.next/standalone` ve `.next/static`) alır. Temel görüntü `node:<sürüm>-alpine`'dır.
- **İçeri girenler:** Bağlam çalışma alanının köküdür, ama içeri yalnız izin listesindeki dosyalar girer (`sunucu/cekirdek/Dockerfile.dockerignore`). Liste her şeyi dışarıda bırakarak başlar. `.env`, `siteler/`, testler ve `node_modules` içeri hiç girmez.
- **Çalışma:** Kutu `node` kullanıcısıyla çalışır, kod kök kullanıcıya aittir ve uygulama onu değiştiremez. Site klasörü kutuya salt okunur olarak `/siteler/<kod-adi>` yoluna bağlanır ve `SITE_KLASORU` onu gösterir; kod adının klasör adıyla aynı olması şemanın kuralıdır. Gizli bilgiler (şimdilik `VERITABANI_ADRESI`) kutuya çalışırken ortam değişkeniyle verilir. Next.js'in kullanım bilgisi gönderimi görüntüde de kapalıdır (karar 0020).
- **Denetim:** `pnpm cekirdek-goruntusu-denetle` görüntüde `.env`, site klasörü, kimlik ya da ayar dosyası, kayıttaki bir sitenin adı ya da `.env`'deki bir gizli değer olup olmadığını; kutunun kök kullanıcıyla çalışıp çalışmadığını ve sürüm etiketinin çekirdek sürümüyle uyuşup uyuşmadığını denetler. Tarama ağsız, geçici bir kutuda yapılır; aranan değerler kutuya standart girdiyle gider. `--kendi-testi` bilerek bozulmuş bir görüntü üretir ve dört bozukluğun da yakalandığını gösterir.
- **pnpm:** Kutuda pnpm tam sürümüyle kurulur ve kurulum `--config.pm-on-fail=ignore` ile yapılır. Yereldeki pnpm de böyle çalışıyor. pnpm 12 bu ayar olmadan kilit dosyasına kendi sürümünü yazmak istiyor ve `--frozen-lockfile` ile kuruluşu durduruyor. Ayar açıkken kilit dosyası iki yerde aynı okunuyor ve kurulumdan sonra baytı baytına aynı kalıyor. Sürümü temel görüntü ve tam sürümle kurulan pnpm sabitler.

## Neden

- Görüntü siteden bağımsız olunca aynı görüntü her siteyle çalışır, bir çekirdek sürümü sitelerde aynı koddur (karar 0011, 0013, 0026).
- İzin listesi, sonradan eklenen bir dosyanın ya da gizli bilginin görüntüye kendiliğinden girmesini engeller. Yasak listesi ise unutulan her dosyayı içeri alırdı.
- Standalone derleme yalnız çalışmaya gereken dosyaları alır. Görüntü küçülür, içinde derleme araçları ve geliştirme paketleri olmaz.
- Kök olmayan kullanıcı ve kök kullanıcıya ait kod, uygulamadaki bir açığın kutuyu ya da kodu değiştirmesini zorlaştırır. Salt okunur site klasörünü uygulama değiştiremez.
- Denetim kayıt değil sonuç üzerinde çalışır: Dockerfile'da ne yazdığına değil, görüntünün içinde ne olduğuna bakar.

## Düşünülen diğer yollar

- Görüntüyü `cekirdek` adıyla etiketlemek: Seçilmedi. Bu bilgisayarda başka bir projenin `cekirdek:*` görüntüleri var, adlar çakışırdı.
- Yasak listesiyle `.dockerignore`: Seçilmedi. Gerekçesi yukarıda.
- Tek aşamalı görüntü, içinde `next start` ile: Seçilmedi. Bütün geliştirme paketleri ve kaynak kod görüntüde kalırdı.
- pnpm'i corepack ile kurmak: Seçilmedi. Aynı kilit dosyası sorununu çıkarıyor, ayrıca corepack Node.js'in sonraki sürümlerinde artık gelmiyor.
- Kilit dosyasını pnpm'in istediği bölümle yeniden yazmak: Şimdilik seçilmedi. Yereldeki bütün kurulumu etkiler ve kendi başına bir iştir. pnpm yükseltilirken yeniden bakılır.
- Debian tabanlı (`-slim`) görüntü: Seçilmedi. Daha büyük. Kullanılan paketlerde Alpine'da çalışmayan yerel kod yok, `pg` saf JavaScript.

## Sonuçları

- Görüntü şu an yaklaşık 300 MB'tır.
- Görüntünün içinde site bilgisi olmadığını iki şey korur: derlemenin site olmadan yapılması (karar 0026) ve görüntü denetimindeki site adı taraması.
- Denetim şimdilik `pnpm cekirdek-goruntusu` her çalıştığında yapılır. Yayın öncesi kontrol hattına kart 0017'de bağlanır.
- Kutunun yerel veritabanına ulaşması için yerel ortamın ağına bağlanması ve adresin o ağdaki adı kullanması gerekir. Bu düzeni kart 0016 kurar.
- Arka plan işlerinin ikinci süreci kuyruk yazılınca eklenir (kart 0031). Sağlık yoklaması (HEALTHCHECK) yayın komutuyla birlikte yazılır (kart 0021).
