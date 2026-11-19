// İptalin ve iadenin tutarı ve vergisi (kart 0235, karar 0147). Saf hesaptır: siparişin saklanan değerlerinden
// (kalemlerin vergisiz tutarı, vergisi ve oranları, kargo, toplam, ödenen) ve önceki iadelerden hesaplanır; fiyat ya
// da vergi yeniden hesaplanmaz. Kuruş yalnız vergi modülünün yuvarlama işlevleriyle bölünür.
//
// Kurallar:
// - Kalemin müşteriye maliyeti vergisiz tutarı artı vergisidir (vergi dahil ve hariç gösterimde aynı). a adetin tutarı
//   ve vergisi, iade edilen toplam adede kadar olan payın bir öncekinden farkıdır: round(T·(önceki+a)/n) −
//   round(T·önceki/n). Kalemin bütün adetleri iade edilince tutar ve vergi tam olarak kalemin kendisidir (artan kuruş
//   kalmaz).
// - Kargo bir kerede iade edilir: maliyeti toplamdan kalemlerin maliyeti çıkınca kalandır, vergisi vergi toplamından
//   kalemlerin vergisi çıkınca kalandır.
// - Kalemin vergisi birden çok orana bölünmüşse oranların büyüklüğüyle dağıtılır (oranlaDagit).
// - Seçilen ürünler ve kargo siparişin kalan her şeyini kapsıyorsa iade "tam"dır: tutar ödenen tutarın kalanıdır
//   (kartla taksitli ödemenin taksit farkı da döner, kullanıcı kararı); fark vergisizdir.
// - Elle yazılan tutar hesaplananın yerine geçer; kalanı aşamaz, sıfır olamaz. Vergisi hesaplanan vergiyle orantılıdır;
//   hiç ürün ve kargo seçilmediyse siparişin vergi dökümüyle orantılıdır.
// - İptal: ödeme alınmışsa ödenen tutarın kalanı (vergi dökümü siparişinki), alınmamışsa sıfır; bütün kalemler ve
//   kargo iptale girer (stoğa konacak adet için).
import type { IadeTuru } from "../../kayitlar/siparis.ts";
import { bolVeYuvarla, kurusa, oranlaDagit } from "../vergi/yuvarlama.ts";
import type { VergiDokumu } from "./model.ts";

export type HesapKalemi = {
  sira: number;
  adet: number;
  vergisiz: number;
  vergi: number;
  vergiOranlari: { ad?: string | undefined; oran: number }[];
};

export type HesapSiparisi = {
  toplam: number;
  vergiToplami: number;
  vergiDokumu: VergiDokumu;
  // Müşterinin ödediği tutar (kartla taksitli ödemede taksit farkıyla); ödeme alınmadıysa null.
  odenen: number | null;
  kalemler: HesapKalemi[];
};

export type OncekiIade = {
  tutar: number;
  kargoTutari: number;
  kalemler: { sira: number; adet: number }[];
};

export type IadeSecimi = {
  kalemler: { sira: number; adet: number }[];
  kargo: boolean;
  elleTutar?: number | undefined;
};

export type IadeHesabi = {
  tutar: number;
  vergiDokumu: VergiDokumu;
  kalemler: { sira: number; adet: number; tutar: number }[];
  kargoTutari: number;
  // Seçim siparişin kalanının tamamı mı (ürünler ve kargo).
  tam: boolean;
};

export type IadeHatasi =
  | "kalem-yok"
  | "adet-fazla"
  | "kargo-iade-edildi"
  | "bos-iade"
  | "tutar-fazla"
  | "tutar-gecersiz"
  | "odenmemis";

// Arka plan süreci Node ile doğrudan yükler: parametre özelliği (readonly kurucu değişkeni) kullanılmaz.
export class IadeHesapHatasi extends Error {
  readonly kod: IadeHatasi;
  readonly alan: string;
  constructor(kod: IadeHatasi, alan: string) {
    super(kod);
    this.kod = kod;
    this.alan = alan;
  }
}

const big = (sayi: number) => BigInt(sayi);

// Toplam T'nin n adetten k adedine düşen payı (yuvarlanmış); k = n iken tam T'dir.
const pay = (toplam: number, adet: number, k: number): bigint =>
  bolVeYuvarla(big(toplam) * big(k), big(adet));

type DokumSatiri = { ad?: string | undefined; oran: number; matrah: bigint; vergi: bigint };

// Oranın satırına vergi ve matrah ekler. Üst üste binen oranlarda (aynı kalemde iki oran) matrah her oranın kendi
// satırına tam yazılır: her oran aynı vergisiz tutardan hesaplanmıştır.
const dokumeEkle = (
  dokum: Map<string, DokumSatiri>,
  satir: { ad?: string | undefined; oran: number },
  vergi: bigint,
  matrah: bigint,
) => {
  if (vergi === 0n && matrah === 0n) return;
  const anahtar = `${satir.oran}:${satir.ad ?? ""}`;
  const var_ = dokum.get(anahtar);
  if (var_ === undefined) dokum.set(anahtar, { ad: satir.ad, oran: satir.oran, vergi, matrah });
  else {
    var_.vergi += vergi;
    var_.matrah += matrah;
  }
};

// Kalemin vergisinin oranlara dağılımı (oranların büyüklüğüyle).
const kalemVergiDagilimi = (kalem: HesapKalemi, vergi: bigint) =>
  kalem.vergiOranlari.length === 0
    ? []
    : oranlaDagit(
        vergi,
        kalem.vergiOranlari.map((oran) => big(oran.oran)),
      ).map((pay, sira) => ({ oran: kalem.vergiOranlari[sira] ?? { oran: 0 }, vergi: pay }));

const dokumYaz = (dokum: Map<string, DokumSatiri>): VergiDokumu =>
  [...dokum.values()]
    .filter((satir) => satir.vergi > 0n)
    .sort((a, b) => b.oran - a.oran)
    .map((satir) => ({
      ...(satir.ad === undefined ? {} : { ad: satir.ad }),
      oran: satir.oran,
      matrah: kurusa(satir.matrah),
      vergi: kurusa(satir.vergi),
    }));

export const iadeyiHesapla = (
  siparis: HesapSiparisi,
  onceki: readonly OncekiIade[],
  tur: IadeTuru,
  secim: IadeSecimi,
): IadeHesabi => {
  const oncekiToplam = onceki.reduce((toplam, iade) => toplam + iade.tutar, 0);
  const odenen = siparis.odenen;
  const kalan = odenen === null ? 0 : odenen - oncekiToplam;
  const oncekiAdet = new Map<number, number>();
  for (const iade of onceki) {
    for (const kalem of iade.kalemler) {
      oncekiAdet.set(kalem.sira, (oncekiAdet.get(kalem.sira) ?? 0) + kalem.adet);
    }
  }
  const kalemMaliyeti = siparis.kalemler.reduce((t, k) => t + k.vergisiz + k.vergi, 0);
  const kalemVergisi = siparis.kalemler.reduce((t, k) => t + k.vergi, 0);
  const kargoMaliyeti = siparis.toplam - kalemMaliyeti;
  const kargoVergisi = siparis.vergiToplami - kalemVergisi;
  const kargoIadeEdildi = onceki.some((iade) => iade.kargoTutari > 0);

  // İptal: bütün kalan kalemler ve kargo; tutar ödenen kalan.
  const secilen: IadeSecimi =
    tur === "iptal"
      ? {
          kalemler: siparis.kalemler
            .map((k) => ({ sira: k.sira, adet: k.adet - (oncekiAdet.get(k.sira) ?? 0) }))
            .filter((k) => k.adet > 0),
          kargo: kargoMaliyeti > 0 && !kargoIadeEdildi,
        }
      : secim;

  const dokum = new Map<string, DokumSatiri>();
  const kalemler: IadeHesabi["kalemler"] = [];
  let hesaplanan = 0n;
  for (const { sira, adet } of secilen.kalemler) {
    if (adet === 0) continue;
    const kalem = siparis.kalemler.find((k) => k.sira === sira);
    if (kalem === undefined) throw new IadeHesapHatasi("kalem-yok", `kalemler.${sira}`);
    const once = oncekiAdet.get(sira) ?? 0;
    if (!Number.isInteger(adet) || adet < 0 || once + adet > kalem.adet) {
      throw new IadeHesapHatasi("adet-fazla", `kalemler.${sira}`);
    }
    const maliyet = kalem.vergisiz + kalem.vergi;
    const tutar = pay(maliyet, kalem.adet, once + adet) - pay(maliyet, kalem.adet, once);
    const vergi = pay(kalem.vergi, kalem.adet, once + adet) - pay(kalem.vergi, kalem.adet, once);
    for (const parca of kalemVergiDagilimi(kalem, vergi)) {
      dokumeEkle(dokum, parca.oran, parca.vergi, tutar - vergi);
    }
    kalemler.push({ sira, adet, tutar: kurusa(tutar) });
    hesaplanan += tutar;
  }
  let kargoTutari = 0;
  if (secilen.kargo) {
    if (kargoIadeEdildi) throw new IadeHesapHatasi("kargo-iade-edildi", "kargo");
    if (kargoMaliyeti > 0) {
      kargoTutari = kargoMaliyeti;
      hesaplanan += big(kargoMaliyeti);
      // Kargonun vergisi: siparişin dökümünden kalemlerin oran oran vergisi çıkınca kalan.
      const kalemDokumu = new Map<string, DokumSatiri>();
      for (const kalem of siparis.kalemler) {
        for (const parca of kalemVergiDagilimi(kalem, big(kalem.vergi))) {
          dokumeEkle(kalemDokumu, parca.oran, parca.vergi, 0n);
        }
      }
      const kargoMatrahi = big(kargoMaliyeti - kargoVergisi);
      let kargoKalan = big(kargoVergisi);
      for (const satir of siparis.vergiDokumu) {
        const anahtar = `${satir.oran}:${satir.ad ?? ""}`;
        const fark = big(satir.vergi) - (kalemDokumu.get(anahtar)?.vergi ?? 0n);
        if (fark > 0n && kargoKalan > 0n) {
          let pay_ = fark;
          if (pay_ > kargoKalan) pay_ = kargoKalan;
          dokumeEkle(dokum, satir, pay_, kargoMatrahi);
          kargoKalan -= pay_;
        }
      }
    }
  }

  const tamUrunler = siparis.kalemler.every(
    (k) =>
      (oncekiAdet.get(k.sira) ?? 0) +
        (secilen.kalemler.find((s) => s.sira === k.sira)?.adet ?? 0) ===
      k.adet,
  );
  const tam = tamUrunler && (kargoMaliyeti <= 0 || kargoIadeEdildi || secilen.kargo);

  if (tur === "iptal") {
    if (odenen === null) {
      return { tutar: 0, vergiDokumu: [], kalemler, kargoTutari, tam: true };
    }
    return { tutar: kalan, vergiDokumu: dokumYaz(dokum), kalemler, kargoTutari, tam: true };
  }

  if (odenen === null) throw new IadeHesapHatasi("odenmemis", "tutar");
  let tutar = tam ? big(kalan) : hesaplanan;
  let vergiDokumu = dokumYaz(dokum);
  if (secim.elleTutar !== undefined) {
    if (!Number.isSafeInteger(secim.elleTutar) || secim.elleTutar <= 0) {
      throw new IadeHesapHatasi("tutar-gecersiz", "tutar");
    }
    const elle = big(secim.elleTutar);
    // Vergi hesaplanan vergiyle orantılı; hesaplanan yoksa siparişin dökümüyle.
    const kaynak =
      hesaplanan > 0n
        ? { dokum: vergiDokumu, tutar: hesaplanan }
        : { dokum: siparis.vergiDokumu, tutar: big(siparis.toplam) };
    vergiDokumu = kaynak.dokum
      .map((satir) => ({
        ...satir,
        matrah: kurusa(bolVeYuvarla(big(satir.matrah) * elle, kaynak.tutar)),
        vergi: kurusa(bolVeYuvarla(big(satir.vergi) * elle, kaynak.tutar)),
      }))
      .filter((satir) => satir.vergi > 0);
    tutar = elle;
  }
  if (tutar <= 0n) throw new IadeHesapHatasi("bos-iade", "kalemler");
  if (tutar > big(kalan)) throw new IadeHesapHatasi("tutar-fazla", "tutar");
  return { tutar: kurusa(tutar), vergiDokumu, kalemler, kargoTutari, tam };
};
