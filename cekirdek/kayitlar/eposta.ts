// E-posta kayıtlarının durumları ve şablonlarının tek kaydı (kart 0032, karar 0050).
export const epostaDurumu = {
  bekliyor: "bekliyor",
  gonderildi: "gonderildi",
  // Gönderici bağlı değil ya da sitenin gönderen adresi yok: e-posta kimseye gitmedi, denenmez.
  gonderilmedi: "gonderilmedi",
  basarisiz: "basarisiz",
} as const;
export type EpostaDurumu = (typeof epostaDurumu)[keyof typeof epostaDurumu];

// Yeni e-posta: buraya ad, tr.json'a metinler, moduller/eposta/sablon.ts'e tanım.
export const epostaSablonlari = [
  "deneme",
  "hos-geldin",
  "sifre-sifirlama",
  "sifre-degisti",
  // Ekibe davet (kart 0275).
  "yonetici-daveti",
  // Stoğa gelince haber ver eklentisi (kart 0144, karar 0117).
  "stok-bildirimi",
  // Müşteriye giden sipariş e-postaları (kart 0240, karar 0153). Hangi olayın hangisini gönderdiği
  // cekirdek/kayitlar/siparis.ts: siparisGecmisiEpostalari.
  "siparis-alindi",
  "havale-onaylandi",
  "kargoya-verildi",
  "teslim-edildi",
  "siparis-iptali",
  "siparis-iadesi",
  "siparis-kismi-iadesi",
  "musteriye-not",
  "iade-talebi-alindi",
  "iade-talebi-onaylandi",
  "iade-talebi-reddedildi",
  // Kart 0268: mağaza siparişin faturasını ekledi ya da değiştirdi (panelde kutu işaretliyse).
  "fatura-hazir",
  // Kart 0269: mağaza teslimat ya da fatura bilgilerini düzeltti (panelde kutu işaretliyse).
  "adres-guncellendi",
  // Yönetici bildirimleri (kart 0241, karar 0154); hangi bildirimin hangisi olduğu
  // cekirdek/kayitlar/yonetici-bildirimi.ts: yoneticiBildirimTanimlari.
  "yonetici-yeni-siparis",
  "yonetici-havale-bildirimi",
  "yonetici-iade-talebi",
  "yonetici-iptal",
  "yonetici-stok",
  "yonetici-yorum",
  "yonetici-kartla-odeme-uyusmazligi",
  "yonetici-bekleyen-iade",
] as const;
export type EpostaSablonu = (typeof epostaSablonlari)[number];

export const epostaAyari = {
  // Kayıt alıcı adresi taşır, bu süreden sonra silinir. İçerik hiç tutulmaz.
  kayitSaklamaGun: 365,
  // Gönderim sunucusu bağlantıda, selamlamada ya da gönderim sırasında bu kadar susarsa deneme başarısız
  // sayılır. Kuyruğun iş süresinden çok kısadır: iş sınırı dolup gönderim arkada sürmez.
  sunucuZamanAsimiMs: 10_000,
  logoYuksekligi: 48,
} as const;
