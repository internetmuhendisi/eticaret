# 0205 · Bir sürüm numarası yalnız bir çekirdeği gösterir

## Tarih

2026-11-28

## Karar

Bir çekirdek sürüm numarası yalnız bir çekirdeği gösterir. "Aynı çekirdek" git kaydıyla değil, çekirdeğin **parmak iziyle** ölçülür (`komutlar/cekirdek-izi.mts`). Parmak izi bir kayıttaki şu dosyaların git içerik özetidir: kipi, özeti ve yolu, sıradan bağımsız, biçim önekiyle (`v1:`):

- görüntünün tarifi: `sunucu/cekirdek/Dockerfile` ve `Dockerfile.dockerignore`;
- görüntünün derleme içeriği: o kayıttaki dockerignore'un izin listesi, testler ve öteki dışlananlar hariç. Belgeler (`.md`) ve shadcn kaynağı (karar 0077) sayılmaz: çekirdek çalışırken hiçbir `.md` dosyası okumaz, sürüm notları yayından sonra da düzeltilebilir;
- demo paketleri (`cekirdek/demolar/`, karar 0203: paketler çekirdekle sürümlenir, yayın onları kayıttan taşır).

Docker'la anlamı ayrışabilecek bir dockerignore kalıbı (köşeli parantez, ters eğik çizgi, sonu "/" olmayan `**`) iz hesabını durdurur; iz sessizce yanlış hesaplanmaz.

Yayın komutu sunucunun yayın kilidini aldıktan sonra, sunucuya bir şey yazmadan önce sunucudaki bütün ortamların bütün sitelerinin yayın kayıtlarını okur. Aynı sürüm başarılı bir yayında başka bir parmak iziyle yayınlanmışsa durur ve sürümü artırmayı söyler. Yeni yayın kaydı izini taşır (`cekirdekIzi`). İzi olmayan ya da başka biçimde iz taşıyan kaydın izi git kaydından yeniden hesaplanır, hesaplanamazsa çakışma sayılır. Geri dönüş yeni kod yayınlamadığı için sayılmaz; başarısız yayın sayılmaz.

Deneme yayınları da numara alır: çekirdeği değişmiş bir kod yayınlanacaksa önce `cekirdek/surum.ts` artar, sürüm notu yazılır, kimlik yeni sürüme geçer. Sürüme kayıt eki yazılmaz.

Var olan kayıtlar değişmez. Örnek Mağaza'nın üç farklı kayıtla yayınlanmış `0.1.0`'ı kayıtta kalır; o numara bir daha yayınlanamaz.

## Neden

- Sahip paneli, sürüm notu ve güncelleme akışı "bu site hangi kodda" sorusunu numaradan cevaplar (karar 0011, 0024). Aynı numara iki kodu gösterirse cevap yanlış olur.
- Kayıt numarasıyla ölçmek yeni siteyi aynı sürüme kurmayı imkânsız kılar. Yayın site klasörünü yayının kaydından çıkarır; yeni sitenin klasörü sürümün yayınlandığı eski kayıtta yoktur. Belge, test, komut ve site klasörü değişikliği çekirdeği değiştirmez, parmak izi bunları dışarıda bırakır.
- Görüntünün tarifi ize girer: yalnız `Dockerfile`'ı değişen bir kayıt (paketleme, başlangıç komutu) aynı dosyalardan başka bir görüntü üretir.
- İzin listesi görüntünün kendi tanımından okunur. Görüntüye yeni bir klasör alınınca ize kendiliğinden girer, iki liste ayrışmaz.
- Görüntünün kendi özeti (Docker) kullanılamaz: aynı dosyalardan iki derleme farklı özet verir.
- Denetimin yayın kilidinin içinde olması, aynı anda iki sitenin aynı numarayla iki farklı çekirdek yayınlamasını önler.
- Sürüme ek yazmak (`0.81.0-ab12cd3` gibi) görüntü adını, kimlik şemasını, sürüm notu testini ve sahip panelini değiştirir; numara yine tek başına kodu söylemez.

## Düşünülen diğer yollar

- Aynı sürümün yalnız aynı git kaydıyla yayınlanması: yeni site eski kayıttan kurulamaz, her yeni site yeni sürüm ister.
- Sürüme kayıt eki: kart 0040'ta yazılı engeller (görüntü adında `+` geçemez, kimlik şeması ve sürüm notu testi reddeder) ve numaranın yine iki parçayla okunması.
- Yalnız aynı sitenin kayıtlarına bakmak: iki site aynı numarayla iki kod çalıştırabilir.
- İzi yalnız `cekirdek/` klasöründen almak: paket dosyaları, bileşenler ve bağımlılık değişikliği izden kaçar.

## Sonuçları

- Çekirdekte, bileşenlerde, bağımlılıklarda ya da demo paketinde bir değişiklik bile yayından önce sürüm artırımı ve sürüm notu ister.
- Yayın denemesi (`pnpm yayin-denemesi`) de aynı kuraldan geçer. Yayınlanmış bir sürüm başka bir çekirdekle denenemez. Denemenin geçici sitelerinin kayıtları silindiği için henüz hiçbir siteye çıkmamış bir numara denemede tekrar kullanılabilir.
- Bugün ana dalın kimliği `0.81.0`'dadır ve yayındaki `0.81.0`'dan başka bir çekirdeği gösterir. Örnek Mağaza'nın bir sonraki yayını en az `0.82.0` olur (kart 0351).
- Denetim sunucudaki kayıtları ve bilgisayardaki git geçmişini ister. Eski bir kaydın commit'i bilgisayarda yoksa çakışma sayılır ve yayın durur: güvenli yöndedir, geçmiş çekilince geçer.
- İzin tanımı değişirse biçim öneki artar; eski biçimde saklanan izler git kaydından yeniden hesaplanır, aynı kodun yeniden yayını durmaz.
- Bir sitenin yayın kaydı okunamazsa (yarım kalmış satır) o sitenin sürümleri bilinmediği için bütün sitelerin yayını durur; hata sitenin adını söyler.
- Kural sunucudaki kayıt dosyalarına dayanır. Bir sitenin yayın klasörü silinirse (site kaldırılır ya da devredilir) onun yayınladığı numaralar kuralın gözünden çıkar; site kaldırma işi kayıt dosyasını saklamalıdır. Başarılı yayından sonra kayıt yazılamazsa (bu karttan önce de olan sınır) o yayın da sayılmaz.
- Görüntü çalışma kopyasından derlenir; git'in yok saydığı (gitignore'lu) bir dosya derleme içeriğine girip izden kaçabilir. Bugün görüntüyü değiştiren böyle bir dosya yoktur, yalnız disiplindir.
- Sürüm notunun yayından sonra değişmemesi ve kimliğin yeni sürüme geçmesi yine yalnız disiplindir. Kimliğin sürümü bu kayıttaki çekirdekle zaten aynı olmak zorundadır (`yayinGoruntusunuHazirla`).
