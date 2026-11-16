# 0131 · Düşen tarayıcı testinin izi hatta saklanır

## Tarih

2026-11-16

## Karar

Tarayıcı testleri Playwright'ın iz kaydıyla çalışır (`playwright.config.ts`, `trace: "retain-on-failure"`). Testin her adımının zamanı, ağ istekleri ve sayfanın görüntüleri kaydedilir. İz geçen testte silinir, düşen testte `test-results/` altında kalır.

Kontrol hattı, tarayıcı testleri adımı kırmızı biterse bu klasörü hattın sonucuna ekler (`.github/workflows/kontrol-hatti.yml`, "Düşen tarayıcı testlerinin izi"). Klasör 14 gün saklanır. Kullanıcı kararıdır (kart 0207).

## Neden

Kart 0207'deki düşüş hatta bir kez görüldü: stoğa gelince haber ver formu 5 saniye boyunca "Gönderiliyor…"da kaldı. Yerelde hattın koşulunda yeniden üretilemedi. Denenen koşullar:

- iki işlemci, tek işçi, temiz veritabanı;
- yapay yük;
- hattaki dosya sırası;
- önbelleksiz sunucu;
- iki bütün takım (254/254 ve 254/254).

Gönderim yerelde en çok 1,9 saniye sürdü. Hattın günlüğünde o 20 saniyeye ait tek satır yoktu, o yüzden beklemenin hangi adımda geçtiği bilinemedi.

Kart 0203 ve 0152'de de sebep, düşüşü yerelde yeniden üretip Playwright'ın içine kayıt eklenerek bulundu. Hatta yalnız ara sıra düşen test için bu yol çalışmaz. İz, düşüşün kendisini kaydeder.

## Düşünülen diğer yollar

- **Hattı aynı kayıtla yeniden çalıştırmak.** Her çalışma ücretli. Düşüşün ne sıklıkla olduğunu gösterir, nerede beklediğini göstermez.
- **Kartı "yeniden üretilemedi" diye kapatmak.** Bir sonraki düşüşte de aynı noktada kalınırdı.
- **İzi her testte saklamak (`on`).** Geçen testlerin izi işe yaramaz; hattın sonucunu ve diski şişirir.
- **İlk yeniden denemede iz almak (`on-first-retry`).** Hatta yeniden deneme yoktur, olmamalıdır: ara sıra düşen testi yeşile çevirip gizler.
- **Yalnız bu testin içine zaman kaydı koymak.** Yalnız bu testi kapsar. Bir sonraki ara sıra düşüş başka testte olur.

## Sonuçları

- İz her testte tutulur, yalnız düşende saklanır: kayıt her testi biraz yavaşlatır. Bütün takımın süresi aynı koşulda ölçüldü (kart 0207'nin ölçüm bölümü).
- İzde hattın deneme verisi, testlerin deneme şifreleri ve her çalışmada üretilen rastgele şifreler vardır. Gerçek gizli bilgi yoktur, çünkü hatta gerçek gizli bilgi yoktur (karar 0029). Hattın sonucunu depoya erişimi olan herkes indirebilir.
- Yükleme eylemi öteki eylemler gibi kayıt kimliğiyle sabitlenir (`actions/upload-artifact`, v7.0.2).
- Yerelde de düşen testin izi `test-results/` altında kalır; `pnpm exec playwright show-trace <dosya>` ile açılır. Klasör kayıt dışıdır.
- Hız ölçümünün ayarı (`playwright.hiz.config.ts`) iz tutmaz: iz, ölçülen süreyi değiştirirdi.
