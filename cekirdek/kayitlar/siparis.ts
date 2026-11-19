// Siparişin kayıtları (kart 0214, 0234; karar 0141, 0145; .claude/rules/kayit-dosyalari.md). Durum ve geçmiş nedeni
// adları siparişe ve sipariş geçmişine yazılır: yayınlandıktan sonra ancak eski kayıtları dönüştüren bir veri
// değişikliğiyle değişir. Veritabanındaki denetimler (siparisler_durum, siparis_gecmisi_neden, siparis_notlari_tur)
// ve geçiş tetikleyicisi (siparis_durum_gecisi) bu listelerle aynıdır, bunu
// cekirdek/moduller/siparis/testler/servis.test.ts ve durum.test.ts denetler.

// Sipariş durumları ve geçişleri (karar 0145). Tek durum tanımıdır: panel, e-posta ve rapor bunu kullanır.
// - odeme-bekleniyor: havale ve kapıda ödemede sipariş bu durumla kurulur. Havalede ödeme onaylanınca, kapıda
//   ödemede mağaza sahibi hazırlamaya alınca hazırlanıyor olur.
// - hazirlaniyor: sipariş hazırlanıyor (kartla ödemede sipariş bu durumla kurulur, kart 0215).
// - kargoda: kargoya verildi. İptal edilemez (kullanıcı kararı): ürün dönünce teslimden sonra iade edilir.
// - teslim-edildi: mağaza sahibi elle işaretler (kullanıcı kararı; kendiliğinden geçiş yoktur).
// - kismi-iade, iade-edildi: kart 0235'in iade akışıyla. Kısmi iadeden sonra yeni iade yapılabilir (kullanıcı kararı).
// - iptal: sipariş iptal oldu, düşen stok geri kondu.
// gecis: durumun geçebileceği durumlar. rozet: panelde ve vitrinde durumun rozet türü (bilesenler/parcalar/rozet).
export const siparisDurumTanimlari = {
  "odeme-bekleniyor": { gecis: ["hazirlaniyor", "iptal"], rozet: "uyari" },
  hazirlaniyor: { gecis: ["kargoda", "iptal"], rozet: "ikincil" },
  kargoda: { gecis: ["teslim-edildi"], rozet: "koyu" },
  "teslim-edildi": { gecis: ["kismi-iade", "iade-edildi"], rozet: "basari" },
  "kismi-iade": { gecis: ["iade-edildi"], rozet: "uyari" },
  "iade-edildi": { gecis: [], rozet: "cerceveli" },
  iptal: { gecis: [], rozet: "cerceveli" },
} as const satisfies Record<
  string,
  {
    gecis: readonly string[];
    rozet: "uyari" | "ikincil" | "koyu" | "basari" | "cerceveli";
  }
>;
export type SiparisDurumu = keyof typeof siparisDurumTanimlari;
export const siparisDurumlari = Object.keys(siparisDurumTanimlari) as SiparisDurumu[];
export const gecebilirMi = (onceki: SiparisDurumu, sonraki: SiparisDurumu): boolean =>
  (siparisDurumTanimlari[onceki].gecis as readonly string[]).includes(sonraki);

// "Yalnız satın alanlar yorum yapabilir" açıkken müşterinin ürünü satın almış sayıldığı durumlar (karar 0145: teslim
// edilmiş sipariş). Kısmi iadede ürünün kendisinin iade edilip edilmediği kart 0235'te bağlanır.
export const satinAlmaDurumlari = [
  "teslim-edildi",
  "kismi-iade",
] as const satisfies readonly SiparisDurumu[];

// Sipariş geçmişinin nedenleri: durum neden değişti.
// - olusturuldu: müşteri siparişi verdi (önceki durum yoktur).
// - havale-suresi-doldu: havalenin ödeme süresi doldu, sipariş kendiliğinden iptal oldu.
// - havale-bildirildi: müşteri ödediğini bildirdi; durum değişmez, bildirim siparişe yazılır.
// - havale-onaylandi, hazirlamaya-alindi, kargoya-verildi, teslim-edildi: panelin işlemleri (siparisIslemleri).
// - kargo-duzeltildi: kargodaki siparişin firması ya da takip numarası düzeltildi; durum değişmez.
// - yonetici-iptali, iade-yapildi: mağaza sahibinin iptali ve iadesi (kart 0235, iadeYap). Bir kısmi iadeden sonraki
//   kısmi iade durumu değiştirmez (kismi-iade → kismi-iade).
// - panelden-olusturuldu: mağaza sahibi ya da görevli siparişi panelden girdi (kart 0236, elleSiparisVer).
export const siparisGecmisiNedenleri = [
  "olusturuldu",
  "panelden-olusturuldu",
  "havale-suresi-doldu",
  "havale-bildirildi",
  "havale-onaylandi",
  "hazirlamaya-alindi",
  "kargoya-verildi",
  "kargo-duzeltildi",
  "teslim-edildi",
  "yonetici-iptali",
  "iade-yapildi",
] as const;
export type SiparisGecmisiNedeni = (typeof siparisGecmisiNedenleri)[number];

// Panelin sipariş işlemleri (kart 0234). Her işlem tek geçiştir; yontem verilmişse yalnız o ödeme yöntemindeki
// siparişte yapılır. odeme: işlem ödemenin alındığı andır (havalede onay, kapıda ödemede teslim). izin: işlemi
// yapan yöneticinin izni (cekirdek/moduller/siparis/izinler.ts; havale onayı yalnız mağaza sahibinde, kullanıcı
// kararı).
export const siparisIslemleri = {
  "havale-onayla": {
    onceki: "odeme-bekleniyor",
    sonraki: "hazirlaniyor",
    neden: "havale-onaylandi",
    yontem: "havale",
    odeme: true,
    izin: "siparis.havale-onayla",
  },
  "hazirlamaya-al": {
    onceki: "odeme-bekleniyor",
    sonraki: "hazirlaniyor",
    neden: "hazirlamaya-alindi",
    yontem: "kapida-odeme",
    odeme: false,
    izin: "siparis.yonet",
  },
  "kargoya-ver": {
    onceki: "hazirlaniyor",
    sonraki: "kargoda",
    neden: "kargoya-verildi",
    yontem: null,
    odeme: false,
    izin: "siparis.yonet",
  },
  "kargo-duzelt": {
    onceki: "kargoda",
    sonraki: "kargoda",
    neden: "kargo-duzeltildi",
    yontem: null,
    odeme: false,
    izin: "siparis.yonet",
  },
  "teslim-edildi": {
    onceki: "kargoda",
    sonraki: "teslim-edildi",
    neden: "teslim-edildi",
    yontem: null,
    // Kapıda ödemede para teslimde alınır; öteki yöntemlerde ödeme zaten alınmıştır (servis yalnız boşsa yazar).
    odeme: true,
    izin: "siparis.yonet",
  },
} as const satisfies Record<
  string,
  {
    onceki: SiparisDurumu;
    sonraki: SiparisDurumu;
    neden: SiparisGecmisiNedeni;
    yontem: "havale" | "kapida-odeme" | null;
    odeme: boolean;
    izin: "siparis.havale-onayla" | "siparis.yonet";
  }
>;
export type SiparisIslemi = keyof typeof siparisIslemleri;

// Siparişin bu durumunda ve ödeme yönteminde, verilen izinlerle yapılabilen işlemler (panelin düğmeleri). Ekran
// işlemi yeniden süzmez; servis yine denetler.
export const yapilabilirIslemler = (
  durum: SiparisDurumu,
  yontem: string,
  yetkili: (izin: "siparis.yonet" | "siparis.havale-onayla") => boolean,
): SiparisIslemi[] =>
  (Object.keys(siparisIslemleri) as SiparisIslemi[]).filter((islem) => {
    const tanim = siparisIslemleri[islem];
    return (
      tanim.onceki === durum &&
      (tanim.yontem === null || tanim.yontem === yontem) &&
      yetkili(tanim.izin)
    );
  });
export const kargoIslemleri = [
  "kargoya-ver",
  "kargo-duzelt",
] as const satisfies readonly SiparisIslemi[];

// İptal ve iade (kart 0235, karar 0147). Tek akıştır (cekirdek/moduller/siparis/iade.ts):
// - iptal: ödeme bekleyen ya da hazırlanan sipariş; ödeme alınmışsa ödenen tutarın tamamı geri döner.
// - iade: teslim edilmiş ya da kısmen iade edilmiş siparişin ürünleri (adet adet), kargosu ya da elle yazılan tutar.
//   Bütün ürünler ve kargo iade edilince sipariş "iade edildi", değilse "kısmi iade" olur.
// Para kartla ödemede ödeme kuruluşu üzerinden döner (eklenti); öteki yöntemlerde mağaza sahibi kendisi gönderir, iade
// kaydedilince yapılmış sayılır (kullanıcı kararı). Kuruluşun yanıtı gelmezse iade "bekliyor"da kalır, sipariş
// değişmez; reddedilen iade "basarisiz"dır, hiçbir şey değişmez.
export const iadeTurleri = ["iptal", "iade"] as const;
export type IadeTuru = (typeof iadeTurleri)[number];
export const iadeDurumlari = ["bekliyor", "tamamlandi", "basarisiz"] as const;
export type IadeDurumu = (typeof iadeDurumlari)[number];
// İptal ve iadenin nedenleri (panelde seçilir, kayda yazılır).
export const iadeNedenleri = [
  "musteri-vazgecti",
  "beklentiyi-karsilamadi",
  "kusurlu-hasarli",
  "yanlis-urun",
  "stok-yok",
  "diger",
] as const;
export type IadeNedeni = (typeof iadeNedenleri)[number];
// Hangi durumdaki siparişte hangi tür yapılır.
export const iadeyeAcikDurumlar: Record<IadeTuru, readonly SiparisDurumu[]> = {
  iptal: ["odeme-bekleniyor", "hazirlaniyor"],
  iade: ["teslim-edildi", "kismi-iade"],
};
export const iadeSinirlari = { aciklamaEnCok: 500 } as const;

// Siparişin notları (kart 0234): iç not yalnız panelde, müşteriye not müşterinin sipariş ayrıntısında görünür
// (e-postası kart 0240). Not sonradan değiştirilemez.
export const siparisNotTurleri = ["ic", "musteri"] as const;
export type SiparisNotTuru = (typeof siparisNotTurleri)[number];

// Sınırlar: notun ve takip numarasının uzunluğu, kargo firması listesi, panelin liste sayfası ve aranan metin.
export const siparisSinirlari = {
  notEnCok: 1000,
  takipNumarasiEnCok: 60,
  kargoFirmasiAdEnCok: 60,
  kargoFirmasiEnCok: 20,
  takipAdresiEnCok: 300,
  sayfaBoyu: 20,
  aramaEnCok: 100,
} as const;

// Kargo firmasının takip adresinde takip numarasının yerini gösteren işaret ("https://.../{takip}").
export const takipNumarasiYeri = "{takip}";

// Takip adresinin kuralı (ayar şeması ve sipariş ayarları servisi bunu kullanır): şifreli bağlantı, takip
// numarasının yeri tam bir kez, "@" yok (adreste kullanıcı adı olmaz; değişiklik kaydı "@"li değeri e-posta sayar
// ve reddeder, bağımsız kontrolün bulgusu).
export const takipAdresiGecerliMi = (adres: string): boolean =>
  adres.startsWith("https://") &&
  !adres.includes("@") &&
  adres.split(takipNumarasiYeri).length === 2 &&
  URL.canParse(adres.replace(takipNumarasiYeri, "0"));

// Siparişteki kişisel bilgilerin saklama süresi (karar 0145): altyapı sahibinin ayarıdır, yıl. Süre hukukçuya
// teyit ettirilir (kart 0063); varsayılan teyide kadar öneridir. Temizlik günde bir çalışır, bir çalışmada en çok bir
// parti sipariş temizler.
export const kisiselVeriSaklamaSinirlari = { enAz: 1, enCok: 30, varsayilan: 10 } as const;
export const kisiselVeriTemizlikPartisi = 500;

// Sipariş alındı sayfasının çerezi: siparişi veren tarayıcıya verilen erişim anahtarı (veritabanında yalnız
// özeti durur). Yalnız sipariş alındı sayfasının yoluna gider, bir gün geçerlidir. Siparişleri ve sipariş takibi
// on üçüncü bölümdedir.
export const siparisErisimCerezi = {
  ad: "siparis-erisim",
  yol: "/siparis-alindi",
  saniye: 24 * 60 * 60,
} as const;

// Sipariş numarasının görünüşü: önek, tire ve sıra numarası ("ORN-1001").
export const siparisNumarasiKalibi = /^[A-Z]{2,5}-[1-9][0-9]{0,11}$/;

// İptal taramasının bir çalışmada iptal ettiği en çok sipariş: kalan bir sonraki çalışmaya kalır.
export const havaleIptalPartisi = 100;
