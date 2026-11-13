// Eklentilerin tek kaydı (kart 0144, karar 0117). Eklenti temel pakette olmayan özelliktir; tarifi
// eklentiler/<kod>.md dosyasında, kodu cekirdek/eklentiler/<kod>/ klasöründedir.
//
// Eklentinin kodu çekirdektedir ama hiçbir sitede kendiliğinden açılmaz: sitenin açık eklentileri altyapı sahibinin
// `eklentiler` ayarıdır (ayarlar.json), varsayılanı boş listedir. Açık olup olmadığı yalnız eklentiAcikMi ile
// sorulur (cekirdek/eklentiler/acik.ts).
export const eklentiKodlari = ["stoga-gelince-haber-ver"] as const;
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
