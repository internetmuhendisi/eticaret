// Yönetici bildirimlerinin verisi (kart 0241, karar 0154). Olay anında yazılır, kuyruğa girer: kişisel veri
// gerekenden fazla taşınmaz. Müşterinin yalnız adı ve soyadının baş harfi, adresinden yalnız ülke, il ve ilçe; e-posta
// ve telefon yok. Tutarlar kuruş, anlar ISO yazısıdır; gönderimde sitenin biçimiyle yazılır.
export type KisaAd = { ad: string; harf: string };

// "Deniz Yılmaz" → { ad: "Deniz", harf: "Y" }. Tek sözcükte harf boştur. Harf ilk kod noktasıdır (NFC ile birleşik
// harf tek kod noktasıdır).
export const kisaAdVerisi = (adSoyad: string): KisaAd => {
  const sozcukler = adSoyad
    .trim()
    .split(/\s+/u)
    .filter((s) => s !== "");
  const ilk = sozcukler[0] ?? "";
  const son = sozcukler.length > 1 ? (sozcukler.at(-1) ?? "") : "";
  const [harf = ""] = Array.from(son.normalize("NFC"));
  return { ad: ilk, harf };
};

export type KalemVerisi = { ad: string; secim: string[]; adet: number };

export type YoneticiBildirimVerisi = {
  "yeni-siparis": {
    numara: string;
    musteri: KisaAd;
    uye: boolean;
    odemeYontemi: string;
    kapidaSecenegi: string | null;
    bolge: { ulke: string; il?: string; ilce?: string };
    adet: number;
    kalem: number;
    toplam: number;
  };
  "havale-bildirimi": {
    numara: string;
    gonderen: KisaAd;
    banka: string;
    odemeTarihi: string;
    tutar: number;
  };
  "iade-talebi": { numara: string; kalemler: KalemVerisi[]; neden: string; teslim: string | null };
  iptal: { numara: string; neden: "havale-suresi-doldu" | "musteri-iptali"; toplam: number };
  stok: {
    uyarilar: {
      ad: string;
      secim: string[];
      stokKodu: string | null;
      tur: string;
      miktar: number;
    }[];
  };
  yorum: { urun: string; puan: number; yazan: KisaAd; metin: string };
  "kartla-odeme-uyusmazligi": { gun: string; sayi: number };
  "bekleyen-iade": { numara: string; neden: "raporda-yok" | "kismi-red" };
};
