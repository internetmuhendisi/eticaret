# 0022 · Veritabanı erişimi Drizzle ile, değişiklikler numaralı dosyalarla

## Tarih

2026-10-28

## Karar

- **Erişim kütüphanesi:** Drizzle ORM, PostgreSQL sürücüsü node-postgres (`pg`). Tablolar TypeScript ile `cekirdek/veritabani/tablolar/` altında (ileride modüllerin `model.ts` dosyalarında) tanımlanır.
- **Değişiklik dosyaları:** drizzle-kit tablolardan SQL dosyası üretir (`pnpm veritabani-degisikligi-uret --name <kisa-ad>`), dosyalar `cekirdek/veritabani/degisiklikler/` altında sıra numarasıyla durur. Her dosyanın ilk satırı geri dönüş notudur: `-- Geri dönüş: geri alınabilir.` ya da `-- Geri dönüş: yedekten.` Notu olmayan dosya testte kırmızıdır ve hiçbir değişiklik uygulanmaz.
- **Uygulama:** `pnpm veritabani-guncelle siteler/<kod-adi>` bekleyen değişiklikleri sırayla uygular. Uygulananlar sitenin veritabanındaki `uygulanan_degisiklikler` tablosunda durur. Drizzle bir değişikliği yalnız zamanı son uygulanandan yeniyse uygular ve içeriğe bakmaz; bu yüzden uygulamadan önce iki denetim yapılır: dosyaların zamanı sırayla artar, veritabanındaki kayıt dosyaların ilk aynı sayıdakiyle içerik özeti olarak birebir aynıdır. Biri tutmazsa hiçbir değişiklik uygulanmaz. İlk değişiklik `veritabani_kimligi` tablosunu açar; güncelleme bu tabloya sitenin kod adını yazar ve başka bir sitenin veritabanına değişiklik uygulamaz.
- **Ortak alan türleri** (`cekirdek/veritabani/turler.ts`): kimlik veritabanının ürettiği rastgele UUID, zaman saat dilimli (`timestamp with time zone`), tutar kuruş cinsinden tam sayı (`bigint`, karar 0019).
- **Site başına veritabanı:** Veritabanının ve kullanıcısının adı `site_<kod adı>` (tire alt çizgi olur). PostgreSQL adları 63 harfte kestiği için kod adı en çok 40 harftir. `pnpm site-veritabani-ac siteler/<kod-adi>` ikisini açar. Kullanıcı süper kullanıcı değildir, veritabanı ve kullanıcı açamaz, yalnız kendi veritabanına bağlanır.
- **Yerel ortam:** `sunucu/compose.yaml` içinde PostgreSQL 18.6. Yalnız bu bilgisayardan, `.env` dosyasındaki porttan erişilir (`pnpm veritabani-baslat`, `pnpm veritabani-durdur`).
- **Gizli bilgiler:** Yönetici şifresi ve sitenin bağlantı adresi (`VERITABANI_ADRESI`) yalnız `.env` dosyasında durur, adları `.env.example` dosyasında yazar.

## Neden

- Kural, değişikliklerin araçla üretilmesini istiyor. Drizzle değişikliği tablo tanımından kendisi üretir. Tanım ve veritabanı birbirinden ayrışmaz.
- Drizzle sorgularında `${deger}` her zaman parametre olarak gider. Elle sorgu yazmak gerekince de güvenli yol varsayılandır.
- node-postgres en yaygın ve bakımı süren PostgreSQL sürücüsüdür.
- Uygulanan değişikliklerin kaydı veritabanında durduğu için veritabanı kendi durumunu bilir (karar 0011). Değişiklikler ikinci kez uygulanmaz.
- Tutar kuruşta tam sayı olunca kodda ve veritabanında aynı biçim kullanılır, yuvarlama hatası olmaz. Kuralın istediği "sabit ondalık" böyle sağlanır: ondalık sayısı para biriminin ayarındadır.
- Rastgele UUID dışarıdan sırayla tahmin edilemez. Zamana göre sıralı UUID kaydın oluşturulma zamanını da ele verirdi.
- PostgreSQL kullanıcı açarken şifreyi parametre olarak almaz. Bu yüzden kullanıcı psql ile açılır. psql adı ve şifreyi kendisi tırnaklar (`komutlar/site-veritabani-ac.sql`), metin birleştirilmez. Şifre komut satırına değil, ortam değişkenine yazılır.

## Düşünülen diğer yollar

- Kysely: Seçilmedi. Sorgu yazımı güçlüdür, ama değişiklik dosyaları elle yazılır, tablo tanımıyla veritabanı ayrışabilir.
- Prisma: Seçilmedi. Ayrı bir şema dili ve kendi çalıştırıcısı gelir, projeye ikinci bir dil girer.
- Tutar için `numeric` (sabit ondalıklı sayı): Seçilmedi. Kod kuruşta tam sayıyla çalışıyor (karar 0019). Veritabanı başka biçimde tutsa her okuma ve yazmada dönüşüm gerekir.
- Zamana göre sıralı UUID (v7): Seçilmedi. Gerekçesi yukarıda. Bu ölçekte rastgele UUID'nin indeks yükü önemsizdir.
- Veritabanı testleri, veritabanı kapalıyken atlansın: Seçilmedi. Atlanan test geçmiş gibi görünür. Veritabanı kapalıysa testler kırmızıdır.

## Sonuçları

- `pnpm testler` için yerel veritabanı kutusu açık olmalı, Örnek Mağaza'nın veritabanı açılmış ve güncellenmiş olmalı (README). Bilgisayarda Docker gerekir.
- drizzle-kit ayarını eski modül biçiminde yükler. Bu yüzden `drizzle.config.ts` değişiklik klasörünü düz yolla yazar. Bu yolun uygulamanınkiyle aynı olduğunu bir test denetler.
- drizzle-kit'in kullandığı esbuild kurulum betiği çalıştırmaz (`pnpm-workspace.yaml`). Araç onsuz da çalışıyor.
- `sql.raw()` yalnız sabit metin, `execute()` yalnız `sql`...`` şablonu alır. Bunu kod denetimi zorlar (`denetim/kurallar/ham-sql.grit`, `execute-sorgu.grit`). Denetim `sql`'in takma adla alınmasını tanımaz, bu kısım yalnız disiplindir.
- İki işte aynı anda değişiklik üretilirse ikincisi ana dala girerken zamanı eski kalabilir. Sıra denetimi bunu durdurur; o dosya silinip yeniden üretilir.
- Sunucuda veritabanı ve kullanıcı açmak site kurma komutunun işidir (`planlar/komutlar.md`). Yerel komut bu adımın ilk hâlidir.
- Kullanıcının yalnız kendi veritabanına girmesi bugün her veritabanındaki izinle sağlanır. PostgreSQL'in bağlantı kurallarıyla güvenceye alınması kart 0036'da, veri ayrımının test edilmesi kart 0012'dedir.
- Bu kararla karar 0013'teki "veritabanı erişim kütüphanesi" açık konusu kapanır.
