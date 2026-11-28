# 0040 · Aynı sürüm numarası farklı çekirdeği göstermesin

## Amaç

Çekirdeğin görüntüsü `altyapi-cekirdek:<sürüm>` adını alıyor. Örnek Mağaza'nın yayın kaydında üç yayın var, üçü de `0.1.0` sürümüyle ama üç farklı kayıttan: `380d46e` ve `ed1b203` (kart 0022), `bb6bcc6` (kart 0023). Aynı numara farklı kodu gösterince sahip paneli, sürüm notu ve güncelleme tarifi "bu site hangi kodda çalışıyor" sorusunu numaradan cevaplayamaz (karar 0011, 0024). Bir sürüm numarası yalnız bir çekirdeği göstermeli.

Bölüm: Yeni mağaza. On altıncı bölümde açık kartlardan bu bölüme alındı; sürüm numarası birden çok sitede tek kodu göstermeli.

## Olmazsa olmazlar

- Yayınlanmış bir sürüm numarasıyla farklı bir çekirdek yayınlanamaz. Örneğin yayın komutu, sunucudaki yayın kayıtlarında aynı sürümün başka bir çekirdek kaydıyla yayınlandığını görürse durur. Yol karar kaydında seçilir.
- Geliştirme sırasındaki deneme yayınlarının nasıl numaralanacağı karara yazılır. Seçenekler: her yayında sürümü artırmak ya da sürüme kayıt eki eklemek. Ek `0.1.0+380d46e` biçiminde yazılamaz: Docker görüntü adında `+` geçemez, kimlik şeması ve sürüm notu testi de bu biçimi bugün reddeder. Ek seçilirse biçimi bunlara göre kurulur.
- Kararı ve kontrolü bozan bir örnek testte yakalanır.

## Sınırlar

- Sahip paneli bu işe girmez.
- Var olan yayın kayıtları değiştirilmez.

## Bitti sayılır

- Aynı sürümle farklı bir çekirdeği yayınlama denemesi duruyor (testte ve bir kez sunucuda).
- Kararın kaydı yazıldı.
- Sürüm notlarının ve güncelleme tarifinin bu kuralı anlatan satırı eklendi.

## Sonuç

- **Karar 0205 (teknik).**
  - Bir sürüm numarası yalnız bir çekirdeği gösterir. "Aynı çekirdek" git kaydıyla değil, çekirdeğin parmak iziyle ölçülür (`komutlar/cekirdek-izi.mts`).
  - Parmak izi şu dosyaların git özetidir: Dockerfile, dockerignore, görüntünün izin listesindeki dosyalar (testler ve `.md` belgeler hariç) ve demo paketleri. Böylece yeni site, çekirdeği değişmemiş sonraki bir kayıttan aynı sürüme kurulabilir.
  - Deneme yayınları da numara alır, sürüme ek yazılmaz.
- **Kilit.**
  - Yayın komutu kilidin içinde ve görüntüye, veritabanına ve kutulara dokunmadan önce sunucudaki bütün ortamların bütün sitelerinin yayın kayıtlarını okur (`butunKayitlariOku`).
  - Aynı sürüm başka bir izle yayınlanmışsa durur, "sürümü artırın" der. Kayda başarısız yayın olarak yazılır.
  - Yeni kayıt izini taşır (`cekirdekIzi`, `v1:` önekli). Eski kayıtların izi git kaydından hesaplanır, var olan kayıtlar değişmedi.
- **Ölçümler.**
  - `komutlar/testler/cekirdek-izi.test.ts` (63 test). 19 denetim ayrı ayrı bilerek bozularak denendi, her biri kırmızıya düştü.
  - Komutların bütün testleri (816), tür kontrolü ve denetim yeşil.
  - Sunucunun gerçek kayıtlarıyla bir kez (2026-11-28, yalnız okuma): ana dalın kaydı (4426e115, kimlik 0.81.0) yayındaki 0.81.0'dan (e5328447, Örnek Mağaza yayın 17) başka bir çekirdek olduğu için durur. Yayındaki kaydın kendisi geçer.
  - Tam `pnpm yayinla` çalıştırılmadı: hat kilidi önce gelir, durunca sunucuya başarısız yayın satırı yazılır ve bir yayın numarası harcanır. Yayın komutunun kuralı çağırması testte yalnız yazıyla denetlenir.
- **Bağımsız kontrolün bulgularıyla düzeltilen.**
  - Dockerfile ize girmiyordu, belgeler (sürüm notları dahil) giriyordu.
  - İzin biçim öneki yoktu.
  - Ağaç `-z`'siz okunuyordu: Türkçe harfli yol izden düşebilirdi.
  - Docker'la ayrışabilecek kalıplar sessizce yanlış eşleşiyordu; artık hata verir, `./` kökle aynıdır.
  - Okunamayan kaydın hatası siteyi söylemiyordu.
  - Yorum ve plan "hiçbir şeye dokunmadan" diyordu.
- **Yalnız disiplin.**
  - Gitignore'lu bir dosya görüntüye girip izden kaçabilir; bugün böyle dosya yok.
  - Silinen sitenin kayıtları kaybolur.
  - Bir sitenin okunamayan kaydı bütün yayınları durdurur (güvenli yön).
- **Sonraki kartlara.**
  - Örnek Mağaza'nın bir sonraki yayını en az 0.82.0 olur (kart 0351'e yazıldı).
  - Yayın denemesi de aynı kuraldan geçer: yayınlanmış bir sürümle denenemez.
  - Site kaldırma ve devretme işi (bugün komutu yok) o sitenin yayın kaydını saklamalı (karar 0205).

## Durum

bitti
