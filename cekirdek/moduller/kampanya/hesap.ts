// Kuponun tek hesabı (kart 0312, karar 0187). Sepet hesabı (sepetiHesapla) kuponu yalnız buradan uygular; sepet,
// ödeme, sipariş, e-posta, fiş ve iade aynı sonucu siparişin kaydından okur. Saf hesaptır: kuponun satırı, kapsamı ve
// kullanım sayıları servisten (servis.ts) gelir.
//
// Kurallar:
// - Geçerlilik sırayla denetlenir, ilk tutmayan söylenir (kuponRedNedenleri): bulunamadı (yok, kapalı, silinmiş),
//   başlamadı, süresi doldu (bitiş anı dahil değil), toplam sınır doldu, kişi başı sınır doldu (yalnız kişi
//   bilinince), sepette kapsama giren ürün yok, en az tutarın altında.
// - Kapsam: satılabilir satırlardan kapsama girenler; "indirimde geçmez" kuponda indirimdeki ürünün satırı kapsam
//   dışıdır (satıra "indirimli" yazılır).
// - En az tutar sepetin ara toplamıyla (gösterim biçiminde, kupondan önce, bütün satılabilir satırlar) karşılaştırılır;
//   eşit tutar geçer.
// - Yüzde: kapsamdaki satırların tutarı (fiyat girişi biçiminde) toplanır, yüzdesi bir kez yuvarlanır (yarım kuruş
//   yukarı). Tutar: kuponun değeri, kapsamdaki tutarı aşmaz. İndirim kapsamdaki satırlara tutarlarıyla orantılı
//   dağılır, artan kuruş vergi modülünün kuralıyla (oranlaDagit: küsuratı büyük olana, eşitse önce gelene).
// - Ücretsiz kargo: ürün indirimi yoktur; sepet hesabı ücretli kargoyu ücretsiz yapar.
import type { KuponRedNedeni, KuponTuru } from "../../kayitlar/kampanya.ts";
import { bolVeYuvarla, kurusa, oranlaDagit } from "../vergi/yuvarlama.ts";

export type HesapKuponu = {
  tur: KuponTuru;
  deger: number;
  enAzTutar: number | null;
  baslangic: Date | null;
  bitis: Date | null;
  toplamSinir: number | null;
  kisiBasiSinir: number | null;
  indirimdeGecmez: boolean;
  acik: boolean;
};

export type KuponSatiri = {
  // Satırın tutarı, fiyat girişi biçiminde (birim fiyat × adet).
  tutar: number;
  // Ürün kuponun kapsamında mı (kapsam "hepsi" ise her zaman).
  kapsamda: boolean;
  // Ürünün geçerli fiyatı satış fiyatının altında.
  indirimde: boolean;
};

export type KuponDurumu = {
  an: Date;
  // Sepetin ara toplamı, gösterim biçiminde, kupondan önce.
  araToplam: number;
  // Sayılan kullanımlar (bu oturumun kendi ayırması hariç). Kişi bilinmiyorsa kişininki verilmez.
  toplamKullanim: number;
  kisiKullanimi?: number;
};

export type KuponSonucu =
  | { gecti: false; neden: Exclude<KuponRedNedeni, "en-az">; disarida: SatirDisi[] }
  | { gecti: false; neden: "en-az"; kalan: number; disarida: SatirDisi[] }
  | { gecti: true; indirimler: number[]; ucretsizKargo: boolean; disarida: SatirDisi[] };

// Satırın kuponun dışında kalma nedeni: kapsam dışı ya da indirimli ürün; kapsamdaki satırda null.
export type SatirDisi = "kapsam" | "indirimli" | null;

export const kuponuUygula = (
  kupon: HesapKuponu | undefined,
  satirlar: readonly KuponSatiri[],
  durum: KuponDurumu,
): KuponSonucu => {
  const disarida: SatirDisi[] = satirlar.map((satir) =>
    !satir.kapsamda
      ? "kapsam"
      : kupon?.indirimdeGecmez === true && satir.indirimde
        ? "indirimli"
        : null,
  );
  const red = (neden: Exclude<KuponRedNedeni, "en-az">): KuponSonucu => ({
    gecti: false,
    neden,
    disarida,
  });
  if (kupon === undefined || !kupon.acik) return red("bulunamadi");
  if (kupon.baslangic !== null && durum.an < kupon.baslangic) return red("baslamadi");
  if (kupon.bitis !== null && durum.an >= kupon.bitis) return red("suresi-doldu");
  if (kupon.toplamSinir !== null && durum.toplamKullanim >= kupon.toplamSinir) {
    return red("sinir-doldu");
  }
  if (
    kupon.kisiBasiSinir !== null &&
    durum.kisiKullanimi !== undefined &&
    durum.kisiKullanimi >= kupon.kisiBasiSinir
  ) {
    return red("kullanildi");
  }
  const kapsamdakiler = satirlar
    .map((satir, yer) => ({ satir, yer }))
    .filter(({ yer }) => disarida[yer] === null);
  if (kapsamdakiler.length === 0) return red("urun-yok");
  if (kupon.enAzTutar !== null && durum.araToplam < kupon.enAzTutar) {
    return { gecti: false, neden: "en-az", kalan: kupon.enAzTutar - durum.araToplam, disarida };
  }

  const indirimler = satirlar.map(() => 0);
  if (kupon.tur === "ucretsiz-kargo") {
    return { gecti: true, indirimler, ucretsizKargo: true, disarida };
  }
  const agirliklar = kapsamdakiler.map(({ satir }) => BigInt(satir.tutar));
  const kapsamToplami = agirliklar.reduce((a, b) => a + b, 0n);
  const toplamIndirim =
    kupon.tur === "yuzde"
      ? bolVeYuvarla(kapsamToplami * BigInt(kupon.deger), 100n)
      : BigInt(kupon.deger) < kapsamToplami
        ? BigInt(kupon.deger)
        : kapsamToplami;
  const paylar =
    kapsamToplami === 0n ? agirliklar.map(() => 0n) : oranlaDagit(toplamIndirim, agirliklar);
  kapsamdakiler.forEach(({ yer }, sira) => {
    indirimler[yer] = kurusa(paylar[sira] ?? 0n);
  });
  return { gecti: true, indirimler, ucretsizKargo: false, disarida };
};
