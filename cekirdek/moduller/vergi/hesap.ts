// Verginin tek hesap işlevi (kart 0075, karar 0061). Sepet, ödeme, sipariş, e-posta, panel ve iade vergiyi
// yalnız buradan alır (.claude/rules/e-ticaret-is-kurallari.md). Tutarlar kuruş olarak tam sayıdır,
// oranlar milyonda bir birimindedir (semalar.ts); yuvarlama yalnız yuvarlama.ts ile yapılır.
//
// Kurallar (karar 0061, kullanıcı kararları):
// - Bölge: ayardaki adres (teslimat, fatura ya da mağaza) kullanılır. Adres yoksa ya da silinmemiş
//   sınıfların hiçbirinde o bölgeye uyan oran yoksa mağaza adresi kullanılır. Silinmiş sınıfın kalmış
//   oranı bölgeyi "tabloda var" saydırmaz. Bölge tabloda varsa ama ürünün sınıfının orada oranı yoksa o
//   ürüne vergi uygulanmaz.
// - Hiçbir bölge bulunamazsa ve sınıfı olan bir kalem varsa hesap durur: sessizce vergisiz satılmaz.
//   Sıfır oranlı sınıftaki ürün de sınıfı olan kalemdir (oranı bölgeye göre değişebilir); yalnız vergisiz ürün
//   (sınıfı yok) ve sınıfsız kargo durdurmaz.
// - Bir sınıfın bölgeye uyan oranlarından en özel düzeydekiler geçer: posta kodu, sonra il, sonra yalnız
//   ülke. Posta kodu oranının ayrıca il taşıması düzeyini değiştirmez. Aynı düzeydeki oranlar toplanır.
// - Vergi dahil girişte vergi = vergili × oran / (1 + oran) yuvarlanır, vergisiz = vergili − vergi.
//   Birden çok oranda toplam vergi oranlara göre paylaştırılır. Vergi hariç girişte her oranın vergisi
//   ayrı yuvarlanır.
// - Satır yuvarlamasında her kalem (birim fiyat × adet ve kargo) ayrı yuvarlanır. Ara toplam
//   yuvarlamasında aynı oranlara (ad ve yüzde; hangi sınıftan geldiği önemli değil) düşen kalemler
//   toplanıp bir kez yuvarlanır, sonuç kalemlere tutarlarına göre dağıtılır (toplamları her zaman
//   aynıdır). Oran kümesi farklı kalemlerdeki aynı oran ayrı yuvarlanır: dökümde o oranın vergisi
//   matrah × oran'dan bir iki kuruş farklı olabilir.
// - Döküm: aynı ad ve yüzde bir satırdır. Bir kaleme aynı ad ve yüzdede iki oran uygulanırsa ikincisi
//   ayrı satırdır: matrah iki kez sayılmaz.
// - Silinmiş sınıf kendi oranlarıyla hesaplanır (karar 0060). Vergi kapalıysa vergi sıfırdır, döküm boştur.
import { BilinenHata } from "../../kapi/zarf.ts";
import type { FiyatGirisi, VergiAdresi, VergiYuvarlama } from "./semalar.ts";
import { tamOran } from "./semalar.ts";
import type { VergiOrani, VergiSinifi } from "./servis.ts";
import { bolVeYuvarla, kurusa, oranlaDagit } from "./yuvarlama.ts";

export type VergiBolgesi = {
  ulke: string;
  il?: string | undefined;
  postaKodu?: string | undefined;
};

export type HesapSatiri = {
  // Birim fiyat, kuruş. Fiyat girişi ayarına göre vergi dahil ya da hariçtir.
  birimFiyat: number;
  adet: number;
  // Ürünün vergi sınıfı; null vergisiz üründür.
  sinif: string | null;
};

export type HesapAyarlari = {
  vergiAcik: boolean;
  vergiAdi?: string | undefined;
  fiyatGirisi: FiyatGirisi;
  vergiAdresi: VergiAdresi;
  vergiYuvarlama: VergiYuvarlama;
};

export type HesapGirdisi = {
  ayarlar: HesapAyarlari;
  // Silinmiş sınıflarıyla birlikte vergi tablosu.
  tablo: readonly VergiSinifi[];
  adresler: { teslimat?: VergiBolgesi; fatura?: VergiBolgesi; magaza?: VergiBolgesi };
  satirlar: readonly HesapSatiri[];
  // Kargo ücreti, kuruş; fiyat girişi ayarına göre. Kargo sınıfı tablodan gelir.
  kargo?: { tutar: number };
};

export type UygulananOran = { oranKimligi: string; ad?: string; oran: number; vergi: number };
export type KalemSonucu = {
  vergisiz: number;
  vergi: number;
  vergili: number;
  oranlar: UygulananOran[];
};
// Oran oran döküm: aynı ad ve orandaki vergiler bir satırdır. Matrah, o oranın uygulandığı vergisiz tutar.
export type DokumSatiri = { ad?: string; oran: number; matrah: number; vergi: number };
export type VergiSonucu = {
  // Verginin hangi adresin bölgesiyle hesaplandığı; "yok": vergi kapalı ya da vergilenecek kalem yok.
  bolge: VergiAdresi | "yok";
  satirlar: KalemSonucu[];
  kargo?: KalemSonucu;
  dokum: DokumSatiri[];
  toplam: { vergisiz: number; vergi: number; vergili: number };
};

const uyar = (oran: VergiOrani, bolge: VergiBolgesi) =>
  oran.ulke === bolge.ulke &&
  (oran.il === undefined || oran.il === bolge.il) &&
  (oran.postaKodu === undefined || oran.postaKodu === bolge.postaKodu);

const ozgulluk = (oran: VergiOrani) =>
  oran.postaKodu !== undefined ? 2 : oran.il !== undefined ? 1 : 0;

// Bir sınıfın bölgedeki oranları: en özel olanlar, sırasıyla.
const siniftakiOranlar = (sinif: VergiSinifi, bolge: VergiBolgesi): VergiOrani[] => {
  const uyanlar = sinif.oranlar.filter((oran) => uyar(oran, bolge));
  const enOzel = Math.max(-1, ...uyanlar.map(ozgulluk));
  return uyanlar.filter((oran) => ozgulluk(oran) === enOzel).sort((a, b) => a.sira - b.sira);
};

const adiyla = (ad: string | undefined) => (ad === undefined ? {} : { ad });

const tamSayiMi = (deger: number, enAz: number) => Number.isSafeInteger(deger) && deger >= enAz;

// Kalemin oranı ve döküm anahtarı: ad, yüzde ve aynı ad ve yüzdenin kalemdeki kaçıncı tekrarı olduğu.
type KalemOrani = VergiOrani & { gorunenAd?: string; anahtar: string };
type Kalem = { tutar: bigint; oranlar: KalemOrani[]; sirali: number[] };

export const hesapla = (girdi: HesapGirdisi): VergiSonucu => {
  const { ayarlar, tablo } = girdi;
  for (const satir of girdi.satirlar) {
    if (!tamSayiMi(satir.birimFiyat, 0) || !tamSayiMi(satir.adet, 1)) {
      throw new Error("Vergi hesabında birim fiyat sıfır ya da artı, adet artı tam sayı olmalı.");
    }
  }
  if (girdi.kargo !== undefined && !tamSayiMi(girdi.kargo.tutar, 0)) {
    throw new Error("Vergi hesabında kargo ücreti sıfır ya da artı tam sayı olmalı.");
  }

  const siniflar = new Map(tablo.map((sinif) => [sinif.kimlik, sinif]));
  const sinifiBul = (kimlik: string) => {
    const sinif = siniflar.get(kimlik);
    if (sinif === undefined) throw new Error(`Vergi sınıfı tabloda yok: ${kimlik}.`);
    return sinif;
  };
  const kargoSinifi = tablo.find((sinif) => sinif.kargo);
  const kalemSiniflari = [
    ...girdi.satirlar.map((satir) => (satir.sinif === null ? undefined : sinifiBul(satir.sinif))),
    ...(girdi.kargo === undefined ? [] : [kargoSinifi]),
  ];
  const tutarlar = [
    ...girdi.satirlar.map((satir) => BigInt(satir.birimFiyat) * BigInt(satir.adet)),
    ...(girdi.kargo === undefined ? [] : [BigInt(girdi.kargo.tutar)]),
  ];

  // Bölge: ayardaki adres, tabloda yoksa mağaza adresi.
  const vergilenecekVar = ayarlar.vergiAcik && kalemSiniflari.some((sinif) => sinif !== undefined);
  const tablodaMi = (bolge: VergiBolgesi | undefined): bolge is VergiBolgesi =>
    bolge !== undefined &&
    tablo.some((sinif) => !sinif.silindi && sinif.oranlar.some((oran) => uyar(oran, bolge)));
  const secilen = girdi.adresler[ayarlar.vergiAdresi];
  const [kaynak, bolge]: [VergiAdresi | "yok", VergiBolgesi | undefined] = !vergilenecekVar
    ? ["yok", undefined]
    : tablodaMi(secilen)
      ? [ayarlar.vergiAdresi, secilen]
      : tablodaMi(girdi.adresler.magaza)
        ? ["magaza", girdi.adresler.magaza]
        : ["yok", undefined];
  if (vergilenecekVar && bolge === undefined) {
    throw new BilinenHata("is-kurali", { kod: "vergi-bolgesi-yok" });
  }

  const kalemler: Kalem[] = tutarlar.map((tutar, yer) => {
    const sinif = kalemSiniflari[yer];
    const bulunan =
      bolge === undefined || sinif === undefined ? [] : siniftakiOranlar(sinif, bolge);
    const tekrar = new Map<string, number>();
    const oranlar = bulunan.map((oran): KalemOrani => {
      const gorunenAd = oran.ad ?? ayarlar.vergiAdi;
      const ozu = `${gorunenAd ?? ""}\u0000${oran.oran}`;
      const kacinci = tekrar.get(ozu) ?? 0;
      tekrar.set(ozu, kacinci + 1);
      return {
        ...oran,
        ...(gorunenAd === undefined ? {} : { gorunenAd }),
        anahtar: `${ozu}\u0000${kacinci}`,
      };
    });
    // Oranların anahtar sırası: aynı oran kümesindeki kalemler oranlarını aynı sırayla eşler.
    const sirali = oranlar
      .map((_, sira) => sira)
      .sort((a, b) => ((oranlar[a]?.anahtar ?? "") < (oranlar[b]?.anahtar ?? "") ? -1 : 1));
    return { tutar, oranlar, sirali };
  });

  // Kalemleri yuvarlama gruplarına ayırır: satır yuvarlamasında her kalem kendi grubudur, ara toplamda
  // aynı oran kümesine (ad ve yüzde) düşen kalemler bir gruptur. Her grubun her oranının vergisi bir
  // kez yuvarlanır.
  const gruplar = new Map<string, number[]>();
  kalemler.forEach((kalem, yer) => {
    const anahtar =
      ayarlar.vergiYuvarlama === "satir"
        ? `kalem:${yer}`
        : `oranlar:${kalem.sirali.map((sira) => kalem.oranlar[sira]?.anahtar).join("\u0001")}`;
    gruplar.set(anahtar, [...(gruplar.get(anahtar) ?? []), yer]);
  });

  const dahil = ayarlar.fiyatGirisi === "vergi-dahil";
  const milyon = BigInt(tamOran);
  // kalemVergileri[yer][oranSirasi]: kalemin o orandan payı.
  const kalemVergileri: bigint[][] = kalemler.map((kalem) => kalem.oranlar.map(() => 0n));
  for (const yerler of gruplar.values()) {
    const ilk = kalemler[yerler[0] ?? 0];
    const oranlar = (ilk?.sirali ?? [])
      .map((sira) => ilk?.oranlar[sira])
      .filter((o) => o !== undefined);
    if (oranlar.length === 0) continue;
    const grupTutari = yerler.reduce((toplam, yer) => toplam + (kalemler[yer]?.tutar ?? 0n), 0n);
    const oranDegerleri = oranlar.map((oran) => BigInt(oran.oran));
    const oranToplami = oranDegerleri.reduce((a, b) => a + b, 0n);
    const oranVergileri = dahil
      ? oranlaDagit(bolVeYuvarla(grupTutari * oranToplami, milyon + oranToplami), oranDegerleri)
      : oranDegerleri.map((oran) => bolVeYuvarla(grupTutari * oran, milyon));
    oranVergileri.forEach((oranVergisi, kacinci) => {
      const paylar = oranlaDagit(
        oranVergisi,
        yerler.map((yer) => kalemler[yer]?.tutar ?? 0n),
      );
      yerler.forEach((yer, sira) => {
        const satir = kalemVergileri[yer];
        const oranSirasi = kalemler[yer]?.sirali[kacinci];
        if (satir !== undefined && oranSirasi !== undefined) satir[oranSirasi] = paylar[sira] ?? 0n;
      });
    });
  }

  const sonuclar: KalemSonucu[] = kalemler.map((kalem, yer) => {
    const vergiler = kalemVergileri[yer] ?? [];
    const vergi = vergiler.reduce((a, b) => a + b, 0n);
    const vergisiz = dahil ? kalem.tutar - vergi : kalem.tutar;
    return {
      vergisiz: kurusa(vergisiz),
      vergi: kurusa(vergi),
      vergili: kurusa(vergisiz + vergi),
      oranlar: kalem.oranlar.map((oran, sira) => ({
        oranKimligi: oran.kimlik,
        ...adiyla(oran.gorunenAd),
        oran: oran.oran,
        vergi: kurusa(vergiler[sira] ?? 0n),
      })),
    };
  });

  // Döküm: aynı ad ve yüzde bir satır (kalem içindeki tekrar ayrı satır), büyük oran önce.
  const dokum = new Map<string, { ad?: string; oran: number; matrah: bigint; vergi: bigint }>();
  sonuclar.forEach((sonuc, yer) => {
    sonuc.oranlar.forEach((oran, sira) => {
      const anahtar = kalemler[yer]?.oranlar[sira]?.anahtar ?? "";
      const satir = dokum.get(anahtar) ?? {
        ...(oran.ad === undefined ? {} : { ad: oran.ad }),
        oran: oran.oran,
        matrah: 0n,
        vergi: 0n,
      };
      satir.matrah += BigInt(sonuc.vergisiz);
      satir.vergi += BigInt(oran.vergi);
      dokum.set(anahtar, satir);
    });
  });

  const urunSonuclari = sonuclar.slice(0, girdi.satirlar.length);
  const kargoSonucu = girdi.kargo === undefined ? undefined : sonuclar[girdi.satirlar.length];
  const topla = (alan: "vergisiz" | "vergi" | "vergili") =>
    kurusa(sonuclar.reduce((toplam, sonuc) => toplam + BigInt(sonuc[alan]), 0n));
  return {
    bolge: kaynak,
    satirlar: urunSonuclari,
    ...(kargoSonucu === undefined ? {} : { kargo: kargoSonucu }),
    dokum: [...dokum.values()]
      .sort((a, b) => b.oran - a.oran || ((a.ad ?? "") < (b.ad ?? "") ? -1 : 1))
      .map(({ matrah, vergi, ...satir }) => ({
        ...satir,
        matrah: kurusa(matrah),
        vergi: kurusa(vergi),
      })),
    toplam: { vergisiz: topla("vergisiz"), vergi: topla("vergi"), vergili: topla("vergili") },
  };
};
