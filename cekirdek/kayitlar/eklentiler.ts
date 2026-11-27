// Eklentilerin tek kaydı (kart 0144, karar 0117). Eklenti temel pakette olmayan özelliktir; tarifi
// eklentiler/<kod>.md dosyasında, kodu cekirdek/eklentiler/<kod>/ klasöründedir.
//
// Eklentinin kodu çekirdektedir ama hiçbir sitede kendiliğinden açılmaz: sitenin açık eklentileri altyapı sahibinin
// `eklentiler` ayarıdır (ayarlar.json), varsayılanı boş listedir. Açık olup olmadığı yalnız eklentiAcikMi ile
// sorulur (cekirdek/eklentiler/acik.ts).
export const eklentiKodlari = [
  "stoga-gelince-haber-ver",
  "kartla-odeme",
  "excel-ile-toplu-urun-islemleri",
] as const;
export type EklentiKodu = (typeof eklentiKodlari)[number];

// Stoğa gelince haber ver (kart 0144). Talep durumları talep tablosuna yazılır; veritabanındaki denetim
// (stok_bildirimi_talepleri_durum) bu listeyle aynıdır, bunu eklentinin servis testi denetler.
// - bekliyor: e-posta henüz gitmedi, adres saklanır.
// - gonderildi: e-posta kuyruğa girdi, adres talepten silindi (kullanıcı kararı).
export const stokBildirimiDurumlari = ["bekliyor", "gonderildi"] as const;
export type StokBildirimiDurumu = (typeof stokBildirimiDurumlari)[number];

export const stokBildirimiAyari = {
  // Bir gönderim işinin tek işlemde gönderdiği talep sayısı. Her partiden önce stok yeniden okunur: gönderim
  // sırasında stok biterse kalan talepler bekler.
  parti: 50,
  // Talep saklama süresinin sınırları (mağaza sahibinin ayarı stokBildirimiSaklamaGun).
  saklamaGunEnAz: 1,
  saklamaGunEnCok: 365,
  saklamaGunVarsayilan: 90,
  // Panelin listesinde en çok bu kadar birim görünür (en çok bekleyen önce).
  panelSiniri: 200,
  // Bekleyen talebi olup gönderilebilen birimleri arayan zamanlı taramanın aralığı (dakika). Stoğun sıfırdan
  // çıktığı anda gönderilemeyen talepler en geç bu süre sonra gider.
  taramaDakika: 60,
} as const;

// Stok bildirimleri ekranının sıralamaları (kart 0258): en çok bekleyen önce (varsayılan) ya da ilk talebi en eski
// önce; eşitlikte öteki ölçüt. Adreste durur (?sirala=en-eski-talep).
export const stokBildirimiSiralamalari = ["en-cok-bekleyen", "en-eski-talep"] as const;
export type StokBildirimiSiralamasi = (typeof stokBildirimiSiralamalari)[number];

// Kartla ödeme ve taksit (kart 0215, karar 0142). Kart ödemesinin durumları kart ödemeleri tablosuna yazılır;
// veritabanındaki denetim (kart_odemeleri_durum) bu listeyle aynıdır, bunu eklentinin servis testi denetler.
// - baslatildi: ödeme kuruluşunun formu açıldı, sonuç henüz bilinmiyor.
// - odendi: ödeme kuruluşu ödemeyi doğruladı, sipariş kuruldu.
// - basarisiz: ödeme kuruluşu ödemenin olmadığını söyledi (kart reddedildi, müşteri vazgeçti); ayırma bırakıldı.
// - iptal-edildi: ödeme alındı ama sipariş kurulamadı (stok yok), ödeme aynı gün iptal edildi (kullanıcı kararı).
export const kartOdemesiDurumlari = ["baslatildi", "odendi", "basarisiz", "iptal-edildi"] as const;
export type KartOdemesiDurumu = (typeof kartOdemesiDurumlari)[number];

// Kartla iadenin kuruluşa giden parçasının durumu (kart 0235, karar 0147): gönderilecek (yazıldı, istek gitmedi),
// tamam (kuruluş iade etti), red (kuruluş açıkça reddetti), belirsiz (yanıt gelmedi ya da okunamadı; tarama günlük
// rapordan sorar).
export const kartIadesiDurumlari = ["gonderilecek", "tamam", "red", "belirsiz"] as const;
export type KartIadesiDurumu = (typeof kartIadesiDurumlari)[number];

// Ödeme kuruluşunun ortamı (altyapı sahibinin ayarı kartlaOdemeOrtami): deneme ortamı gerçek ödeme almaz.
export const kartlaOdemeOrtamlari = ["deneme", "canli"] as const;
export type KartlaOdemeOrtami = (typeof kartlaOdemeOrtamlari)[number];

export const kartlaOdemeAyari = {
  // Mağaza sahibinin seçebileceği en çok taksit sayıları (ayar kartlaOdemeEnCokTaksit); 1 tek çekimdir.
  taksitSecenekleri: [1, 2, 3, 6, 9, 12],
  enCokTaksitVarsayilan: 12,
  // Ödeme kuruluşuna yapılan her çağrının zaman aşımı (milisaniye).
  zamanAsimiMs: 10_000,
  // Sonucu bilinmeyen (başlatıldı) ödemenin sonucu bu kadar dakika sonra kuruluşa sorulur: müşteri dönmediyse ve
  // bildirim gelmediyse.
  bekleyenSorguDakika: 30,
  // Bekleyen ödemeleri soran taramanın aralığı (dakika) ve bir çalışmada en çok kaç ödeme.
  taramaDakika: 15,
  taramaParti: 100,
  // Tarama bu kadar günden eski ödemeyi artık sormaz: sonucu günlük karşılaştırmada ve hata izlemede görünür.
  sormaGun: 7,
  // Günlük karşılaştırma bir önceki günü karşılaştırır; eklenti kapandıktan sonra bu kadar gün daha çalışır.
  kapandiktanSonraGun: 7,
  // Alıcının kimlik numarası sorulmaz (kullanıcı kararı): bireyselde bu yer tutucu gider.
  kimlikYerTutucu: "11111111111",
  // Yanıtı gelmeyen iade parçası (kart 0235) bu kadar dakika sonra günlük rapordan sorulur. Bu kadar gün içinde raporda
  // bulunmazsa hatası bir kez kaydedilir; parça yine "red" sayılmaz (para dönmüş olabilir), sormaGun boyunca sorulur.
  iadeSorguDakika: 30,
  iadeBulunamazsaGun: 2,
} as const;

// Excel ile toplu ürün işlemleri (kart 0315). Dışa aktarmanın ve içe aktarmanın durumları eklentinin tablolarına
// yazılır; veritabanındaki denetimler (excel_disa_aktarmalari_durum, excel_ice_aktarmalari_durum,
// excel_ice_aktarma_satirlari_sonuc) bu listelerle aynıdır, bunu eklentinin servis testi denetler.
// - Dışa aktarma: hazirlaniyor (iş dosyayı yazıyor), hazir (dosya indirilebilir), hatali (dosya yazılamadı).
// - İçe aktarma: denetleniyor (satırlar okunuyor), onizleme (sonuç onay bekliyor), uygulaniyor, bitti, vazgecildi
//   (yönetici vazgeçti ya da yeni dosya yükledi), okunamadi (dosya .xlsx değil, sınırı aşıyor ya da sütunları
//   tanınmadı; nedeni kayıtta).
// - Satırın sonucu: ekle (yeni ürün ya da birleşim), degistir, ayni (değişmeyecek), hatali.
export const excelDisaAktarmaDurumlari = ["hazirlaniyor", "hazir", "hatali"] as const;
export type ExcelDisaAktarmaDurumu = (typeof excelDisaAktarmaDurumlari)[number];
export const excelIceAktarmaDurumlari = [
  "denetleniyor",
  "onizleme",
  "uygulaniyor",
  "bitti",
  "vazgecildi",
  "okunamadi",
] as const;
export type ExcelIceAktarmaDurumu = (typeof excelIceAktarmaDurumlari)[number];
export const excelSatirSonuclari = ["ekle", "degistir", "ayni", "hatali"] as const;
export type ExcelSatirSonucu = (typeof excelSatirSonuclari)[number];

export const excelAyari = {
  // Bir dosyanın satır sınırı (altyapı sahibinin ayarı excelSatirSiniri): varsayılan ve izin verilen aralık.
  satirSiniriVarsayilan: 5000,
  satirSiniriEnAz: 100,
  satirSiniriEnCok: 50_000,
  // Yüklenen dosyanın en çok boyutu (dosya yükleme sınırı) ve açılmış hâlinin en çok boyutu (sıkıştırma bombası).
  enCokBayt: 10 * 1024 * 1024,
  acilmisEnCokBayt: 100 * 1024 * 1024,
  // Bir hücrenin en çok uzunluğu (en uzun alan ürünün adıdır, 200; kategori yolları ve özellikler daha uzun olabilir).
  hucreEnCok: 2000,
  // Bir arka plan işinin işlediği ürün sayısı; iş bitince sonraki parti kuyruğa girer (iş süresi 300 saniye).
  parti: 100,
  // Dışa aktarma kaydı (indirildiği andaki değerler ve dosya) ve içe aktarma kaydı bu kadar gün saklanır.
  saklamaGun: 30,
  // Önizlemede ekrana gönderilen en çok hatalı ve değişecek satır; tamamı dosyanın kaydındadır.
  onizlemeSatiri: 200,
  // Bu kadar dakikadır ilerlemeyen iş (eklenti kapalıydı, süreç durdu) zamanlı taramayla yeniden kuyruğa girer.
  taramaDakika: 10,
} as const;
