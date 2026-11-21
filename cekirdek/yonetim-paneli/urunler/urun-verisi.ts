// Ürün ekranının verisi (kart 0263, karar 0162): sunucuda servislerle okunur. Form, ürünün düzenlenebilen alanlarının
// ekrandaki hâlidir: sayılar sitenin biçimiyle yazılı metindir (ağırlık sitenin ağırlık biriminde), yayın zamanı sitenin
// saat dilimindeki yerel zamandır, seçili kategori, marka, etiket ve ilgili ürünler adlarıyla gelir (kategori
// yoluyla). Ekran yeni ürün için boş formla da açılır (kimlik yok); yeni ürünün vergi sınıfı sitenin ilk sınıfıdır.
import { and, inArray, isNull } from "drizzle-orm";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import type { OzellikTuru } from "../../kayitlar/ozellik";
import type { ElleStokSebebi } from "../../kayitlar/stok";
import { type UrunDurumu, type UrunTuru, urunDurumVitrini } from "../../kayitlar/urun";
import { yerelZamana } from "../../metinler/bicimleyici";
import { siteninBicimleyicisi } from "../../metinler/site-metni";
import type { YoneticiYetkileri } from "../../moduller/ekip/servis";
import { etiketServisi } from "../../moduller/etiket/servis";
import { kategorileriOku } from "../../moduller/kategori/servis";
import { kategoriYollari } from "../../moduller/kategori/yol";
import { markaServisi } from "../../moduller/marka/servis";
import { ozellikServisi } from "../../moduller/ozellik/servis";
import { aciklamayiTemizle } from "../../moduller/urun/aciklama";
import { urunler } from "../../moduller/urun/model";
import { agirlikYazisi } from "../../moduller/urun/panel-girdisi";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { calisanSiteninVergiServisi } from "../../moduller/vergi/servis";
import { siteninVeritabani } from "../../veritabani/baglanti";
import { kayitAdresleri } from "../../vitrin/adresler";
import { type FiyatStokVerisi, fiyatStokVerisi } from "./fiyat-stok-verisi";
import { type BirlesimFormu, birlesimAnahtari, type VaryantFormu } from "./varyant-formu";

// Seçili kayıt: kimliği ve adı (kategoride yolu).
export type SeciliKayit = { kimlik: string; ad: string };

export type UrunFormu = {
  ad: string;
  adresAdi: string;
  kisaAciklama: string;
  // Biçimli metin (HTML); boşsa boş metin.
  uzunAciklama: string;
  kategoriler: SeciliKayit[];
  marka: SeciliKayit | null;
  etiketler: SeciliKayit[];
  // Vergi sınıfının kimliği; boş metin vergisiz.
  vergiSinifi: string;
  kargoGerekmez: boolean;
  // Basit üründe birimin alanları; varyantlı üründe her birleşimde (kart 0264), formda yoktur.
  stokKodu: string;
  barkod: string;
  agirlik: string;
  enAzAdet: string;
  enCokAdet: string;
  durum: UrunDurumu;
  // Sitenin saat dilimindeki yerel zaman ("2026-11-21T09:30"); zamanlanmamış üründe boş.
  yayinZamani: string;
  // Özelliğin kimliğinden değerine: liste seçeneğin kimliği, evet-hayır "evet" ya da "hayir", sayı sitenin
  // biçimiyle, metin kendisi; değeri olmayan özellik yoktur.
  ozellikler: Record<string, string>;
  ilgiliUrunler: SeciliKayit[];
  // Seçenekler bölümü (kart 0264): seçenekler, değerleri ve kayıtlı birleşimlerin alanları.
  varyant: VaryantFormu;
  // Fiyat bölümü (kart 0265): basit ürünün fiyatı sitenin para biçimiyle; indirimin zamanı bütün birimlere ortaktır.
  fiyat: {
    satisFiyati: string;
    indirimliFiyat: string;
    indirimBaslangici: string;
    indirimBitisi: string;
  };
  // Stok bölümü (kart 0265): ürünün takibi ve eşiği; yeni basit ürünün başlangıç stoğu; birleşim tablosundaki stok
  // değişikliklerinin ortak sebebi ve notu.
  stokTakibi: boolean;
  dusukStokEsigi: string;
  baslangicStogu: string;
  stokSebebi: ElleStokSebebi;
  stokNotu: string;
};

export type UrunEkraniOzelligi = {
  kimlik: string;
  ad: string;
  tur: OzellikTuru;
  birim?: string;
  secenekler: { kimlik: string; ad: string }[];
};

export type UrunEkraniVerisi = {
  // Yeni üründe yok.
  kimlik?: string;
  form: UrunFormu;
  tur: UrunTuru;
  vergiSiniflari: (SeciliKayit & { silindi?: true })[];
  ozellikler: UrunEkraniOzelligi[];
  // Sitenin ağırlık biriminin kısaltması (kg).
  agirlikBirimi: string;
  // Ürünün sayfası şu an vitrinde açılıyorsa adresi.
  vitrinAdresi?: string;
  // Başlığın altındaki satır: ilk kategorinin yolu ve stok kodu.
  baslikAlti: string[];
  // Birleşimin görseli seçilebilen galeri görselleri, sırasıyla (öğenin kimliği, önizlemenin dosyası, alternatif metni).
  galeriGorselleri: { kimlik: string; dosya: string; ad: string }[];
  // Fiyat ve stok bölümlerinin verisi (kart 0265).
  fiyatStok: FiyatStokVerisi;
  izinler: {
    degistir: boolean;
    sil: boolean;
    fiyatGor: boolean;
    fiyatDegistir: boolean;
    stokGor: boolean;
    stokDuzelt: boolean;
  };
};

const bos: Omit<UrunFormu, "vergiSinifi"> = {
  ad: "",
  adresAdi: "",
  kisaAciklama: "",
  uzunAciklama: "",
  kategoriler: [],
  marka: null,
  etiketler: [],
  kargoGerekmez: false,
  stokKodu: "",
  barkod: "",
  agirlik: "",
  enAzAdet: "1",
  enCokAdet: "",
  durum: "taslak",
  yayinZamani: "",
  ozellikler: {},
  ilgiliUrunler: [],
  varyant: { secenekler: [], birlesimler: {} },
  fiyat: { satisFiyati: "", indirimliFiyat: "", indirimBaslangici: "", indirimBitisi: "" },
  stokTakibi: true,
  dusukStokEsigi: "",
  baslangicStogu: "",
  stokSebebi: "sayim",
  stokNotu: "",
};

// Ürün yoksa ya da silinmişse undefined (sayfa bulunamadı verir).
export const urunEkraniVerisi = async (
  kimlik: string | undefined,
  yetkili: YoneticiYetkileri,
  an: Date = new Date(),
): Promise<UrunEkraniVerisi | undefined> => {
  const vt = siteninVeritabani();
  const site = calisanSite();
  const bicimleyici = siteninBicimleyicisi(site.ayarlar);
  const [urun, vergiTablosu, ozellikler] = await Promise.all([
    kimlik === undefined ? undefined : calisanSiteninUrunServisi().urunuOku(vt, kimlik),
    calisanSiteninVergiServisi().tabloyuOku(vt, { silinmisSiniflar: true }),
    ozellikServisi.hepsiniOku(vt),
  ]);
  if (kimlik !== undefined && (urun === undefined || urun.silindi)) return undefined;
  // Silinmemiş sınıflar; ürün silinmiş bir sınıfa bağlıysa o da (bağlıyken silinen sınıf üründe kalır, kart 0076),
  // işaretli: seçim kutusu boş görünmesin (bağımsız kontrolün bulgusu).
  const vergiSiniflari = vergiTablosu
    .filter((sinifi) => !sinifi.silindi || sinifi.kimlik === urun?.vergiSinifi)
    .map(({ kimlik: k, ad, silindi }) => ({ kimlik: k, ad, ...(silindi ? { silindi } : {}) }));
  const ortak = {
    vergiSiniflari,
    ozellikler: ozellikler.map((ozellik) => ({
      kimlik: ozellik.kimlik,
      ad: ozellik.ad,
      tur: ozellik.tur,
      ...(ozellik.birim === undefined ? {} : { birim: ozellik.birim }),
      secenekler: ozellik.secenekler.map(({ kimlik: k, ad }) => ({ kimlik: k, ad })),
    })),
    agirlikBirimi: site.ayarlar.agirlikBirimi,
    izinler: {
      degistir: yetkili("urun.degistir"),
      sil: yetkili("urun.sil"),
      fiyatGor: yetkili("fiyat.gor"),
      fiyatDegistir: yetkili("fiyat.degistir"),
      stokGor: yetkili("stok.gor"),
      stokDuzelt: yetkili("stok.duzelt"),
    },
  };
  const gorme = { fiyat: ortak.izinler.fiyatGor, stok: ortak.izinler.stokGor };
  if (urun === undefined) {
    return {
      ...ortak,
      form: { ...bos, vergiSinifi: vergiSiniflari.find((s) => s.silindi !== true)?.kimlik ?? "" },
      tur: "basit",
      baslikAlti: [],
      galeriGorselleri: [],
      fiyatStok: await fiyatStokVerisi([], new Map(), gorme, an),
    };
  }

  const [kategoriler, markalar, etiketler, ilgililer] = await Promise.all([
    urun.kategoriler.length === 0 ? [] : kategoriYollari(await kategorileriOku(vt)),
    urun.marka === null ? [] : markaServisi.hepsiniOku(vt),
    urun.etiketler.length === 0 ? [] : etiketServisi.hepsiniOku(vt),
    urun.ilgiliUrunler.length === 0
      ? []
      : vt
          .select({ kimlik: urunler.kimlik, ad: urunler.ad })
          .from(urunler)
          .where(and(inArray(urunler.kimlik, urun.ilgiliUrunler), isNull(urunler.silinme_zamani))),
  ]);
  const adiyla = (liste: readonly SeciliKayit[], secili: readonly string[]): SeciliKayit[] =>
    secili.flatMap((k) => {
      const bulunan = liste.find((kayit) => kayit.kimlik === k);
      return bulunan === undefined ? [] : [{ kimlik: bulunan.kimlik, ad: bulunan.ad }];
    });
  const birim = urun.tur === "basit" ? urun.birimler.find((b) => !b.silindi) : undefined;
  const ozellikDegerleri = Object.fromEntries(
    urun.ozellikler.flatMap(({ ozellik, deger }) => {
      const tanim = ozellikler.find((o) => o.kimlik === ozellik);
      if (tanim === undefined) return [];
      const yazi =
        typeof deger === "boolean"
          ? deger
            ? "evet"
            : "hayir"
          : typeof deger === "number"
            ? bicimleyici.sayi(deger, String(deger).split(".")[1]?.length ?? 0)
            : deger;
      return [[ozellik, yazi]];
    }),
  );
  const kategoriAdlari = adiyla(kategoriler, urun.kategoriler);
  const canliBirimler = urun.birimler.filter((b) => !b.silindi);
  const fiyatStok = await fiyatStokVerisi(
    canliBirimler,
    new Map(urun.secenekler.flatMap((s) => s.degerler.map((d) => [d.kimlik, d.ad]))),
    gorme,
    an,
  );
  // Birimin kayıtlı fiyatı ve stoğu formun alanlarıyla (birleşim tablosunun sütunları, basit ürünün fiyatı).
  const birimFiyatStogu = (anahtar: string) => {
    const kayitli = fiyatStok.birimler[anahtar];
    return {
      satisFiyati: kayitli?.satisFiyati ?? "",
      indirimliFiyat: kayitli?.indirimliFiyat ?? "",
      stok: String(kayitli?.stok ?? 0),
    };
  };
  const agirlikAyarlari = { bicimleyici, agirlikBirimi: site.ayarlar.agirlikBirimi };
  // Kayıtlı birleşimler değer kimliklerinin anahtarıyla (formun anahtarı kayıtlı değerde kimliktir).
  const varyant: VaryantFormu = {
    secenekler: urun.secenekler
      .filter((secenek) => !secenek.silindi)
      .map((secenek) => ({
        anahtar: secenek.kimlik,
        kimlik: secenek.kimlik,
        ad: secenek.ad,
        degerler: secenek.degerler
          .filter((deger) => !deger.silindi)
          .map((deger) => ({ anahtar: deger.kimlik, kimlik: deger.kimlik, ad: deger.ad })),
      })),
    birlesimler: Object.fromEntries(
      urun.tur === "varyantli"
        ? urun.birimler
            .filter((b) => !b.silindi && b.degerler.length > 0)
            .map((b): [string, BirlesimFormu] => [
              birlesimAnahtari(b.degerler),
              {
                stokKodu: b.stokKodu ?? "",
                barkod: b.barkod ?? "",
                agirlik: agirlikYazisi(b.agirlikGram, agirlikAyarlari),
                gorsel: b.gorsel ?? null,
                ...birimFiyatStogu(birlesimAnahtari(b.degerler)),
              },
            ])
        : [],
    ),
  };
  const zamanli = urunDurumVitrini[urun.durum].zamanli;
  const vitrinde =
    urunDurumVitrini[urun.durum].sayfa &&
    !(zamanli && (urun.yayinZamani === undefined || urun.yayinZamani.getTime() > an.getTime()));
  return {
    ...ortak,
    kimlik: urun.kimlik,
    form: {
      ad: urun.ad,
      adresAdi: urun.adresAdi,
      kisaAciklama: urun.kisaAciklama ?? "",
      // Vitrinin gördüğü hâli: düz metin açıklama paragraflara çevrilir, düzenleyici satır sonlarını yitirmez.
      uzunAciklama: aciklamayiTemizle(urun.uzunAciklama) ?? "",
      kategoriler: kategoriAdlari,
      marka: urun.marka === null ? null : (adiyla(markalar, [urun.marka])[0] ?? null),
      etiketler: adiyla(etiketler, urun.etiketler),
      vergiSinifi: urun.vergiSinifi ?? "",
      kargoGerekmez: urun.kargoGerekmez,
      stokKodu: birim?.stokKodu ?? "",
      barkod: birim?.barkod ?? "",
      agirlik: agirlikYazisi(birim?.agirlikGram, agirlikAyarlari),
      enAzAdet: String(urun.enAzAdet),
      enCokAdet: urun.enCokAdet === undefined ? "" : String(urun.enCokAdet),
      durum: urun.durum,
      yayinZamani:
        urun.yayinZamani === undefined
          ? ""
          : yerelZamana(urun.yayinZamani, site.ayarlar.saatDilimi),
      ozellikler: ozellikDegerleri,
      // Seçim sırasıyla (urunuOku silinmiş seçimi zaten vermez).
      ilgiliUrunler: adiyla(ilgililer, urun.ilgiliUrunler),
      varyant,
      fiyat: {
        satisFiyati: birimFiyatStogu("").satisFiyati,
        indirimliFiyat: birimFiyatStogu("").indirimliFiyat,
        indirimBaslangici: fiyatStok.indirimBaslangici,
        indirimBitisi: fiyatStok.indirimBitisi,
      },
      stokTakibi: urun.stokTakibi,
      dusukStokEsigi: urun.dusukStokEsigi === undefined ? "" : String(urun.dusukStokEsigi),
      baslangicStogu: "",
      stokSebebi: "sayim",
      stokNotu: "",
    },
    tur: urun.tur,
    ...(vitrinde ? { vitrinAdresi: kayitAdresleri.urun(urun.adresAdi) } : {}),
    baslikAlti: [
      ...(kategoriAdlari[0] === undefined ? [] : [kategoriAdlari[0].ad]),
      ...(birim?.stokKodu === undefined ? [] : [birim.stokKodu]),
    ],
    galeriGorselleri: urun.galeri.flatMap((oge) =>
      oge.tur === "gorsel"
        ? [{ kimlik: oge.kimlik, dosya: oge.dosya, ad: oge.alternatifMetin }]
        : [],
    ),
    fiyatStok,
  };
};
