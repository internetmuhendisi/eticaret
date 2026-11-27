// Gösterilecek fiyatın tek işlevi (kart 0081, karar 0067). Vitrin, sepet ve e-posta bir birimin
// fiyatını yalnız buradan alır: geçerli fiyat, vergi durumu, eski fiyat, fiyatın yanındaki metin ve
// sitenin para biçimiyle yazılmış hâlleri bir arada gelir.
//
// - Tutar, fiyatın girildiği biçimden (fiyatGirisi) gösterim biçimine (fiyatGosterimi) vergi hesabıyla
//   (cekirdek/moduller/vergi/hesap.ts) çevrilir; ikisi aynıysa ya da vergi kapalıysa hesap yapılmaz.
//   Bölge verilmezse (ürün sayfasında müşterinin adresi bilinmez) mağaza adresi kullanılır. Her tutar
//   tek başına, bir adet olarak çevrilir; sepet toplamı vergiyi kendi satırlarıyla hesaplar.
// - Eski fiyat geçmişten bulunur (eski-fiyat.ts) ve aynı biçimde çevrilir.
// - Fiyatın yanındaki metin mağaza sahibinin ayarıdır (fiyatEkMetni). Yazılmamışsa vergi adından ve
//   tutarın vergi durumundan kurulur; vergi kapalıysa ya da ürün vergisizse metin yoktur; boş metin
//   hiçbir şey göstermez.
// - Para birimi ve biçimi site ayarındadır; tutar ortak biçimleyiciden geçer. Çekirdekte para simgesi
//   ve vergi adı yazmaz.
//
// - Fiyat aralığı (kart 0085, kullanıcı kararı): ürünün en düşük ve en yüksek gösterilecek fiyatı
//   (fiyatAraliklari). Yalnız satılabilir birimlerden hesaplanır, müşteri alamayacağı fiyatı "en düşük"
//   görmesin; hiçbiri satılamıyorsa bütün silinmemiş birimlerden. Fiyatı olmayan birim satın alınamaz:
//   aralıkta hiç sayılmaz, satılabilir de sayılmaz. Bütün adaylar aynı tutar, aynı eski fiyat ve aynı
//   indirim durumundaysa tek fiyattır (tek: true). Basit ürünün aralığı tek biriminin fiyatıdır.
//
// Bütün birimler birkaç sorguyla gelir, birim başına sorgu atılmaz.
import { eq, inArray } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { hatayiKaydet } from "../../izleme/hata-katmani.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import { doldur } from "../../metinler/doldur.ts";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { siteninBicimleyicisi } from "../../metinler/site-metni.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { siteninMagazaAyarlari } from "../magaza-ayarlari/servis.ts";
import { siteninStokDurumlari } from "../stok/durum.ts";
import { urunBirimleri, urunler } from "../urun/model.ts";
import { urunlerinBirimleri } from "../urun/varyant.ts";
import type { VergiBolgesi } from "../vergi/hesap.ts";
import type { FiyatGirisi } from "../vergi/semalar.ts";
import { siteninVergiServisi, type VergiSinifi } from "../vergi/servis.ts";
import { eskiFiyatiBul } from "./eski-fiyat.ts";
import { type CeviriBaglami, gosterimeCevir, yeniGiriseCevir } from "./giris-cevirisi.ts";
import { girisDegisiklikleriniOku, satirinGirisi } from "./giris-degisikligi.ts";
import { type FiyatGecmisiSatiri, siteninFiyatServisi } from "./servis.ts";

export type GosterilecekFiyat = {
  // O anda ödenecek tutar, gösterim biçiminde (vergi dahil ya da hariç), kuruş.
  tutar: number;
  // İndirimdeyse ve gösterilecek eski fiyat varsa, aynı biçimde.
  eskiTutar?: number;
  indirimde: boolean;
  paraBirimi: string;
  // Tutarın vergi durumu; vergi kapalıysa ya da ürün vergisizse "yok".
  vergi: FiyatGirisi | "yok";
  ekMetin?: string;
  // İndirimin bittiği an (hariç), indirimdeyse ve bitişi varsa (gecerliFiyat, kart 0111).
  indirimBitisi?: Date;
  // Sitenin para biçimiyle yazılmış hâlleri.
  yazili: { tutar: string; eskiTutar?: string };
};

export type FiyatAraligi = {
  enDusuk: GosterilecekFiyat;
  enYuksek: GosterilecekFiyat;
  // İki uç aynı tutarda: tek fiyat gösterilir.
  tek: boolean;
  // Aralığın sitenin para biçimiyle yazılışı, simge bir kez (kart 0109): "299,90 – 329,90 ¤".
  yaziliAralik: string;
  // İndirim rozeti (kart 0109, karar 0085): adayların en büyük indirim oranı. Adayların oranları
  // farklıysa (biri indirimsiz de olabilir) "varan" indirimdir. Hiçbir adayın oranı yoksa alan yoktur.
  indirim?: { oran: number; varan: boolean };
  // Geri sayımın bitişi (kart 0111, kullanıcı kararı): adayların (yalnız satılabilir birimler, hiçbiri
  // satılamıyorsa hepsi) kartta görünen (oranı en az 1) ve bitişi olan indirimlerinin en yakını. Süresiz
  // indirimde, indirim yokken ve eski fiyatı gösterilemeyen indirimde alan yoktur.
  indirimBitisi?: Date;
};

// İndirim oranı (kart 0109, karar 0085, kullanıcı kararı): eski fiyatın gösterildiği fiyatta, yüzde
// olarak aşağı yuvarlanır; indirim hiçbir zaman olduğundan büyük görünmez. Eski fiyat gösterilmiyorsa
// (30 gün kuralı) oran sıfırdır. Tutarlar gösterim biçimindedir, kuruştur. En büyük oran 1'in altındaysa
// rozet yoktur.
const indirimOrani = (fiyat: GosterilecekFiyat): number =>
  fiyat.eskiTutar === undefined
    ? 0
    : Math.floor(((fiyat.eskiTutar - fiyat.tutar) * 100) / fiyat.eskiTutar);

const araliginIndirimi = (adaylar: GosterilecekFiyat[]): FiyatAraligi["indirim"] => {
  const oranlar = adaylar.map(indirimOrani);
  const enBuyuk = Math.max(...oranlar);
  if (enBuyuk < 1) return undefined;
  return { oran: enBuyuk, varan: oranlar.some((oran) => oran !== enBuyuk) };
};

type Ayarlar = Awaited<ReturnType<typeof siteninMagazaAyarlari>>;
type VergiDurumu = GosterilecekFiyat["vergi"];

// Fiyatın yanındaki metin, tutarın gerçek vergi durumuna göre. Mağaza sahibinin metni her zaman
// görünür (boşsa hiçbir şey); yazılmamışsa metin vergi adından kurulur, vergi yoksa (vergi kapalı ya da
// vergisiz ürün) metin yoktur.
export const ekMetniBul = (
  ayarlar: Ayarlar,
  dil: Site["ayarlar"]["dil"],
  vergi: VergiDurumu,
): string | undefined => {
  if (ayarlar.fiyatEkMetni !== undefined) {
    return ayarlar.fiyatEkMetni === "" ? undefined : ayarlar.fiyatEkMetni;
  }
  if (vergi === "yok") return undefined;
  const metin = metinOkuyucu(dil);
  const dahil = vergi === "vergi-dahil";
  if (ayarlar.vergiAdi === undefined) {
    return metin(dahil ? "vitrin.fiyat.vergilerDahil" : "vitrin.fiyat.vergilerHaric");
  }
  return doldur(metin(dahil ? "vitrin.fiyat.vergiDahil" : "vitrin.fiyat.vergiHaric"), {
    vergi: ayarlar.vergiAdi,
  });
};

// Süreçte bir kez kaydedilen çevirme hatası: her vitrin açılışında yeniden kaydedilmesin.
let bolgeHatasiKaydedildi = false;

export const fiyatGosterimServisi = (site: Site) => {
  const fiyat = siteninFiyatServisi(site);

  const gosterilecekFiyatlar = async (
    vt: Veritabani,
    birimler: string[],
    secenekler: { an?: Date; bolge?: VergiBolgesi } = {},
  ): Promise<Map<string, GosterilecekFiyat>> => {
    const an = secenekler.an ?? new Date();
    const gecerliler = await fiyat.gecerliFiyatlar(vt, birimler, an);
    const sonuc = new Map<string, GosterilecekFiyat>();
    if (gecerliler.size === 0) return sonuc;
    const ayarlar = await siteninMagazaAyarlari(vt, site);
    const indirimdekiler = [...gecerliler].filter(([, g]) => g.indirimde).map(([birim]) => birim);
    const gecmisler =
      indirimdekiler.length === 0
        ? new Map<string, FiyatGecmisiSatiri[]>()
        : await fiyat.gecmisleriOku(vt, indirimdekiler, an);
    // Birimin ürününün vergi sınıfı; null vergisiz üründür.
    const siniflar = new Map(
      (
        await vt
          .select({ birim: urunBirimleri.kimlik, sinif: urunler.vergi_sinifi_kimligi })
          .from(urunBirimleri)
          .innerJoin(urunler, eq(urunler.kimlik, urunBirimleri.urun_kimligi))
          .where(inArray(urunBirimleri.kimlik, [...gecerliler.keys()]))
      ).map((satir) => [satir.birim, satir.sinif]),
    );

    // Tutarı gösterim biçimine çevirir. Vergi kapalıysa ya da ürün vergisizse çevrilmez ve vergi yoktur.
    // Giriş ve gösterim aynıysa hesap yapılmaz. Bölge bulunamazsa (mağaza adresi yok ya da tabloda
    // değil) tutar girildiği biçimde, kendi vergi durumuyla gösterilir ve hata bir kez kaydedilir:
    // tutar ve metni birbirini tutar, vitrin düşmez.
    const cevirmeli = ayarlar.vergiAcik && ayarlar.fiyatGirisi !== ayarlar.fiyatGosterimi;
    // Fiyat girişi değiştiyse (kart 0326) geçmişin eski girişle yazılmış satırları bugünkü girişe çevrilir.
    const girisDegisiklikleri = gecmisler.size === 0 ? [] : await girisDegisiklikleriniOku(vt);
    const tablo: VergiSinifi[] =
      (cevirmeli || girisDegisiklikleri.length > 0) &&
      [...siniflar.values()].some((sinif) => sinif !== null)
        ? await siteninVergiServisi(site).tabloyuOku(vt, { silinmisSiniflar: true })
        : [];
    const magaza = ayarlar.magazaAdresi;
    const adresler = {
      ...(secenekler.bolge === undefined ? {} : { teslimat: secenekler.bolge }),
      ...(magaza === undefined
        ? {}
        : { magaza: { ulke: magaza.ulke, il: magaza.il, postaKodu: magaza.postaKodu } }),
    };
    const baglam: CeviriBaglami = {
      ayarlar,
      tablo,
      ...(secenekler.bolge === undefined ? {} : { bolge: secenekler.bolge }),
      ...(adresler.magaza === undefined ? {} : { magaza: adresler.magaza }),
    };
    const cevir = (tutarlar: number[], sinif: string): number[] =>
      tutarlar.map((tutar) => gosterimeCevir(baglam, tutar, sinif, ayarlar.fiyatGirisi));
    const gosterime = (
      tutarlar: number[],
      birim: string,
    ): { tutarlar: number[]; vergi: VergiDurumu } => {
      const sinif = siniflar.get(birim) ?? null;
      if (!ayarlar.vergiAcik || sinif === null) return { tutarlar, vergi: "yok" };
      if (!cevirmeli) return { tutarlar, vergi: ayarlar.fiyatGosterimi };
      try {
        return { tutarlar: cevir(tutarlar, sinif), vergi: ayarlar.fiyatGosterimi };
      } catch (hata) {
        if (!(hata instanceof BilinenHata) || hata.kod !== "is-kurali") throw hata;
        if (!bolgeHatasiKaydedildi) {
          bolgeHatasiKaydedildi = true;
          hatayiKaydet(hata, { kaynak: "fiyat-gosterimi", ayrinti: hata.ayrinti });
        }
        return { tutarlar, vergi: ayarlar.fiyatGirisi };
      }
    };

    // Geçmiş satırının tutarları yazıldığı girişten bugünkü girişe, fiyat girişinin değişikliğiyle aynı kuralla
    // (mağaza adresinin bölgesi). Satırın girişi girişin değişikliklerinden bulunur (satirinGirisi).
    const magazaBaglami: CeviriBaglami = {
      ayarlar,
      tablo,
      ...(adresler.magaza === undefined ? {} : { magaza: adresler.magaza }),
    };
    const bugunkuGirise = (
      satirlar: FiyatGecmisiSatiri[],
      sinif: string | null,
    ): FiyatGecmisiSatiri[] =>
      girisDegisiklikleri.length === 0
        ? satirlar
        : satirlar.map((satir) => {
            const giris = satirinGirisi(satir.zaman, girisDegisiklikleri, ayarlar.fiyatGirisi);
            if (giris === ayarlar.fiyatGirisi) return satir;
            const cevir = (tutar: number) =>
              yeniGiriseCevir(magazaBaglami, tutar, sinif, giris, ayarlar.fiyatGirisi).tutar;
            try {
              return {
                ...satir,
                satisFiyati: cevir(satir.satisFiyati),
                indirimliFiyat: satir.indirimliFiyat === null ? null : cevir(satir.indirimliFiyat),
              };
            } catch (hata) {
              // Bölge bulunamazsa (mağaza adresi yok ya da vergi tablosunda değil) satır olduğu gibi kalır; vitrin
              // düşmez, hata bir kez kaydedilir (gosterime ile aynı).
              if (!(hata instanceof BilinenHata) || hata.kod !== "is-kurali") throw hata;
              if (!bolgeHatasiKaydedildi) {
                bolgeHatasiKaydedildi = true;
                hatayiKaydet(hata, { kaynak: "fiyat-gosterimi", ayrinti: hata.ayrinti });
              }
              return satir;
            }
          });

    const bicim = siteninBicimleyicisi(site.ayarlar);
    for (const [birim, gecerli] of gecerliler) {
      const eski = gecerli.indirimde
        ? eskiFiyatiBul(
            bugunkuGirise(gecmisler.get(birim) ?? [], siniflar.get(birim) ?? null),
            an,
            gecerli.paraBirimi,
            ayarlar.indirimdeEnDusukFiyat,
          )
        : undefined;
      const {
        tutarlar: [tutar = gecerli.tutar, cevrilmisEski],
        vergi,
      } = gosterime(eski === undefined ? [gecerli.tutar] : [gecerli.tutar, eski], birim);
      // Çevrilince iki tutar aynı kuruşa yuvarlanabilir: eski fiyat yine yüksek değilse gösterilmez.
      const eskiTutar =
        cevrilmisEski !== undefined && cevrilmisEski > tutar ? cevrilmisEski : undefined;
      const ekMetin = ekMetniBul(ayarlar, site.ayarlar.dil, vergi);
      sonuc.set(birim, {
        tutar,
        ...(eskiTutar === undefined ? {} : { eskiTutar }),
        indirimde: gecerli.indirimde,
        paraBirimi: gecerli.paraBirimi,
        vergi,
        ...(ekMetin === undefined ? {} : { ekMetin }),
        ...(gecerli.indirimBitisi === undefined ? {} : { indirimBitisi: gecerli.indirimBitisi }),
        yazili: {
          tutar: bicim.para(tutar),
          ...(eskiTutar === undefined ? {} : { eskiTutar: bicim.para(eskiTutar) }),
        },
      });
    }
    return sonuc;
  };

  // Ürünlerin fiyat aralığı. Fiyatı olan silinmemiş birimi olmayan ürün haritada yoktur. Eşit
  // tutarlarda birimlerin sırasında önce gelen seçilir.
  const aralikBicimi = siteninBicimleyicisi(site.ayarlar);
  const aralikAyirici = metinOkuyucu(site.ayarlar.dil)("vitrin.fiyat.aralikAyirici");

  // Adaylardan aralık (kural yukarıda). Ürün sayfası tek birleşimin fiyatını da bununla tek adaylı aralık olarak
  // kurar (kart 0138): rozet, bitiş ve yazılış kartla aynı kuraldan gelir.
  const araliginiKur = (adaylar: GosterilecekFiyat[]): FiyatAraligi | undefined => {
    const [ilk] = adaylar;
    if (ilk === undefined) return undefined;
    let enDusuk = ilk;
    let enYuksek = ilk;
    for (const fiyat of adaylar) {
      if (fiyat.tutar < enDusuk.tutar) enDusuk = fiyat;
      if (fiyat.tutar > enYuksek.tutar) enYuksek = fiyat;
    }
    const indirim = araliginIndirimi(adaylar);
    // Bitiş yalnız indirimi kartta görünen adaylardan (oranı en az 1, rozetle aynı ölçü; kart 0111 kontrolü):
    // eski fiyatı gösterilemeyen (30 gün kuralı) indirime geri sayılmaz, sayaç ile kart ayrışmaz.
    const bitisler = adaylar.flatMap((fiyat) =>
      fiyat.indirimBitisi === undefined || indirimOrani(fiyat) < 1
        ? []
        : [fiyat.indirimBitisi.getTime()],
    );
    return {
      enDusuk,
      enYuksek,
      ...(indirim === undefined ? {} : { indirim }),
      ...(bitisler.length === 0 ? {} : { indirimBitisi: new Date(Math.min(...bitisler)) }),
      yaziliAralik: aralikBicimi.paraAraligi(enDusuk.tutar, enYuksek.tutar, aralikAyirici),
      // Bütün adaylar aynı tutar ve eski fiyattaysa: eşit tutarda iki uç aynı birleşimden gelir,
      // ötekinin farklı eski fiyatı yalnız bütün adaylara bakılınca görülür.
      tek: adaylar.every(
        (fiyat) =>
          fiyat.tutar === ilk.tutar &&
          fiyat.eskiTutar === ilk.eskiTutar &&
          fiyat.indirimde === ilk.indirimde,
      ),
    };
  };

  const fiyatAraliklari = async (
    vt: Veritabani,
    urunKimlikleri: string[],
    secenekler: { an?: Date; bolge?: VergiBolgesi } = {},
  ): Promise<Map<string, FiyatAraligi>> => {
    const birimleri = await urunlerinBirimleri(vt, urunKimlikleri);
    const hepsi = [...birimleri.values()].flat();
    const fiyatlar = await gosterilecekFiyatlar(vt, hepsi, secenekler);
    const stoklar = await siteninStokDurumlari(vt, site, hepsi);
    const sonuc = new Map<string, FiyatAraligi>();
    for (const [urun, birimler] of birimleri) {
      const fiyatli = birimler.flatMap((birim) => {
        const fiyat = fiyatlar.get(birim);
        return fiyat === undefined ? [] : [{ fiyat, satilabilir: stoklar.get(birim)?.satilabilir }];
      });
      const satilabilir = fiyatli.filter((birim) => birim.satilabilir === true);
      const aralik = araliginiKur(
        (satilabilir.length > 0 ? satilabilir : fiyatli).map((b) => b.fiyat),
      );
      if (aralik !== undefined) sonuc.set(urun, aralik);
    }
    return sonuc;
  };

  return { gosterilecekFiyatlar, fiyatAraliklari, araliginiKur };
};
