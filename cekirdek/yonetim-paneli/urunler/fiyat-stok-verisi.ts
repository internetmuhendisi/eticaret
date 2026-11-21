// Ürün ekranının fiyat ve stok bölümlerinin verisi (kart 0265; taslak: planlar/tasarim-yonu/panel.html, u-fiyat, u-fg,
// u-stok, u-sg). Sunucuda servislerle okunur, ekran yalnız biçimlenmiş hâli çizer:
// - Her birimin (basit ürünün birimi ya da birleşim) kayıtlı fiyatı sitenin para biçimiyle, stoğu ve sepette ayrılan
//   miktarı. Anahtar birleşimin anahtarıdır (değer kimlikleri, varyant-formu.ts); basit birimde boş metin.
// - "Vitrinde şu an" (basit üründe): müşterinin gördüğü fiyat vitrinle aynı işlevden (gosterilecekFiyatlar): tutar,
//   eski fiyat (son 30 günün en düşüğü, kart 0081), indirimin bitişi ve vergi metni.
// - Fiyat ve stok geçmişi: birimlerin hepsi tek listede, en yeni önce, sayfa sayfa (geçmiş uçları aynı işlevleri
//   çağırır). Yazan yönetici e-postasıyla, sistem işlemi adıyla; stokta siparişin numarası.
import { inArray } from "drizzle-orm";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri";
import type { StokSebebi } from "../../kayitlar/stok";
import { yerelZamana } from "../../metinler/bicimleyici";
import { siteninBicimleyicisi } from "../../metinler/site-metni";
import { yoneticiler } from "../../moduller/ekip/model";
import { fiyatGosterimServisi } from "../../moduller/fiyat/gosterim";
import { calisanSiteninFiyatServisi } from "../../moduller/fiyat/servis";
import { siteninMagazaAyarlari } from "../../moduller/magaza-ayarlari/servis";
import { siparisler } from "../../moduller/siparis/model";
import { calisanSiteninStokServisi } from "../../moduller/stok/servis";
import { calisanSiteninUrunServisi } from "../../moduller/urun/servis";
import { siteninVeritabani } from "../../veritabani/baglanti";
import { birlesimAnahtari } from "./varyant-formu";

// Panelde ilk açılışta ve "Daha fazla" ile gelen geçmiş satırı sayısı.
export const panelGecmisSayfasi = 10;

export type Yazan =
  | { tur: "yonetici" | "musteri" | "sahip"; eposta: string | null }
  | { tur: "sistem"; ad: string }
  | null;

export type FiyatGecmisiGorunusu = {
  kimlik: string;
  zaman: string;
  // Birleşimin adı ("S / Gri"); basit üründe yok.
  birlesim?: string;
  satis: string;
  indirimli?: string;
  // İndirimin başlangıcı ve bitişi, yazılıysa.
  baslangic?: string;
  bitis?: string;
  yazan: Yazan;
};

export type StokGecmisiGorunusu = {
  kimlik: string;
  zaman: string;
  birlesim?: string;
  sebep: StokSebebi;
  // Siparişin numarası (sipariş, iptal ve iade sebebinde).
  siparis?: string;
  not?: string;
  degisim: number;
  sonra: number;
  yazan: Yazan;
};

export type GecmisSayfasi<T> = { satirlar: T[]; devam?: string };

export type BirimFiyatStogu = {
  kimlik: string;
  satisFiyati: string;
  indirimliFiyat: string;
  stok: number;
  ayrilan: number;
};

export type FiyatStokVerisi = {
  fiyatGirisi: "vergi-dahil" | "vergi-haric";
  simge: string;
  simgeYeri: "basta" | "sonda";
  // Ürünün eşiği boşken geçerli olan mağazanın düşük stok eşiği.
  magazaEsigi: number;
  birimler: Record<string, BirimFiyatStogu>;
  // Birimlerin ortak indirim zamanı (sitenin saat diliminde yerel zaman; ilk indirimli birimden).
  indirimBaslangici: string;
  indirimBitisi: string;
  vitrin?: {
    tutar: string;
    eskiTutar?: string;
    indirimde: boolean;
    ekMetin?: string;
    bitis?: string;
  };
  fiyatGecmisi?: GecmisSayfasi<FiyatGecmisiGorunusu>;
  stokGecmisi?: GecmisSayfasi<StokGecmisiGorunusu>;
};

type OkunanBirim = { kimlik: string; degerler: string[] };

// Birimlerin adları ("S / Gri"): yalnız birleşimlerde.
const birlesimAdlari = (
  birimler: readonly OkunanBirim[],
  degerAdlari: ReadonlyMap<string, string>,
): Map<string, string> =>
  new Map(
    birimler
      .filter((b) => b.degerler.length > 0)
      .map((b) => [b.kimlik, b.degerler.map((d) => degerAdlari.get(d) ?? "").join(" / ")]),
  );

// Yazanların e-postası tek sorguyla.
const yazanlariCoz = async (kimler: (DegisikligiYapan | null)[]): Promise<Yazan[]> => {
  const kimlikler = [
    ...new Set(kimler.flatMap((k) => (k !== null && k.tur !== "sistem" ? [k.kimlik] : []))),
  ];
  const epostalar = new Map(
    kimlikler.length === 0
      ? []
      : (
          await siteninVeritabani()
            .select({ kimlik: yoneticiler.kimlik, eposta: yoneticiler.eposta })
            .from(yoneticiler)
            .where(inArray(yoneticiler.kimlik, kimlikler))
        ).map((s) => [s.kimlik, s.eposta]),
  );
  return kimler.map((k) =>
    k === null
      ? null
      : k.tur === "sistem"
        ? { tur: "sistem", ad: k.ad }
        : { tur: k.tur, eposta: k.tur === "musteri" ? null : (epostalar.get(k.kimlik) ?? null) },
  );
};

export const fiyatGecmisiSayfasiOku = async (
  birimler: readonly OkunanBirim[],
  degerAdlari: ReadonlyMap<string, string>,
  sonra?: string,
): Promise<GecmisSayfasi<FiyatGecmisiGorunusu>> => {
  const site = calisanSite();
  const bicim = siteninBicimleyicisi(site.ayarlar);
  const satirlar = await calisanSiteninFiyatServisi().panelFiyatGecmisi(
    siteninVeritabani(),
    birimler.map((b) => b.kimlik),
    { ...(sonra === undefined ? {} : { sonra }), sinir: panelGecmisSayfasi },
  );
  const adlar = birlesimAdlari(birimler, degerAdlari);
  const yazanlar = await yazanlariCoz(satirlar.map((s) => s.kim));
  return {
    satirlar: satirlar.map((s, i) => {
      const birlesim = adlar.get(s.birim);
      return {
        kimlik: s.kimlik,
        zaman: bicim.tarihSaat(s.zaman),
        ...(birlesim === undefined ? {} : { birlesim }),
        satis: bicim.para(s.satisFiyati),
        ...(s.indirimliFiyat === null ? {} : { indirimli: bicim.para(s.indirimliFiyat) }),
        ...(s.indirimBaslangici === null
          ? {}
          : { baslangic: bicim.tarihSaat(s.indirimBaslangici) }),
        ...(s.indirimBitisi === null ? {} : { bitis: bicim.tarihSaat(s.indirimBitisi) }),
        yazan: yazanlar[i] ?? null,
      };
    }),
    ...(satirlar.length === panelGecmisSayfasi ? { devam: satirlar.at(-1)?.kimlik ?? "" } : {}),
  };
};

export const stokGecmisiSayfasiOku = async (
  birimler: readonly OkunanBirim[],
  degerAdlari: ReadonlyMap<string, string>,
  sonra?: string,
): Promise<GecmisSayfasi<StokGecmisiGorunusu>> => {
  const vt = siteninVeritabani();
  const bicim = siteninBicimleyicisi(calisanSite().ayarlar);
  const satirlar = await calisanSiteninStokServisi().panelStokGecmisi(
    vt,
    birimler.map((b) => b.kimlik),
    { ...(sonra === undefined ? {} : { sonra }), sinir: panelGecmisSayfasi },
  );
  const kaynaklar = [...new Set(satirlar.flatMap((s) => (s.kaynak === null ? [] : [s.kaynak])))];
  const numaralar = new Map(
    kaynaklar.length === 0
      ? []
      : (
          await vt
            .select({ kimlik: siparisler.kimlik, numara: siparisler.numara })
            .from(siparisler)
            .where(inArray(siparisler.kimlik, kaynaklar))
        ).map((s) => [s.kimlik, s.numara]),
  );
  const adlar = birlesimAdlari(birimler, degerAdlari);
  const yazanlar = await yazanlariCoz(satirlar.map((s) => s.kim));
  return {
    satirlar: satirlar.map((s, i) => {
      const birlesim = adlar.get(s.birim);
      const siparis = s.kaynak === null ? undefined : numaralar.get(s.kaynak);
      return {
        kimlik: s.kimlik,
        zaman: bicim.tarihSaat(s.zaman),
        ...(birlesim === undefined ? {} : { birlesim }),
        sebep: s.sebep,
        ...(siparis === undefined ? {} : { siparis }),
        ...(s.not === null ? {} : { not: s.not }),
        degisim: s.sonrakiMiktar - s.oncekiMiktar,
        sonra: s.sonrakiMiktar,
        yazan: yazanlar[i] ?? null,
      };
    }),
    ...(satirlar.length === panelGecmisSayfasi ? { devam: satirlar.at(-1)?.kimlik ?? "" } : {}),
  };
};

// Geçmiş uçlarının sayfası (kart 0265, "Daha fazla"): ürünün silinmemiş birimleri ve değer adlarıyla; ürün yoksa ya
// da silinmişse undefined.
export const urununGecmisSayfasi = async (
  tur: "fiyat" | "stok",
  urunKimligi: string,
  sonra: string | undefined,
): Promise<GecmisSayfasi<FiyatGecmisiGorunusu | StokGecmisiGorunusu> | undefined> => {
  const urun = await calisanSiteninUrunServisi().urunuOku(siteninVeritabani(), urunKimligi);
  if (urun === undefined || urun.silindi) return undefined;
  const birimler = urun.birimler.filter((b) => !b.silindi);
  const adlar = new Map(urun.secenekler.flatMap((s) => s.degerler.map((d) => [d.kimlik, d.ad])));
  return tur === "fiyat"
    ? fiyatGecmisiSayfasiOku(birimler, adlar, sonra)
    : stokGecmisiSayfasiOku(birimler, adlar, sonra);
};

// Ürünün fiyat ve stok verisi. izinler: fiyatı ve stoğu görme izni; görmeyene o bölümün verisi okunmaz.
export const fiyatStokVerisi = async (
  birimler: readonly OkunanBirim[],
  degerAdlari: ReadonlyMap<string, string>,
  izinler: { fiyat: boolean; stok: boolean },
  an: Date = new Date(),
): Promise<FiyatStokVerisi> => {
  const vt = siteninVeritabani();
  const site = calisanSite();
  const bicim = siteninBicimleyicisi(site.ayarlar);
  const kimlikler = birimler.map((b) => b.kimlik);
  const basit = birimler.length === 1 && birimler[0]?.degerler.length === 0;
  const [magaza, fiyatlar, stoklar, ayrilanlar, gosterim] = await Promise.all([
    siteninMagazaAyarlari(vt, site),
    izinler.fiyat ? calisanSiteninFiyatServisi().fiyatlariOku(vt, kimlikler) : new Map(),
    izinler.stok ? calisanSiteninStokServisi().stoklariOku(vt, kimlikler) : new Map(),
    izinler.stok ? calisanSiteninStokServisi().ayrilanMiktarlar(vt, kimlikler) : new Map(),
    izinler.fiyat && basit
      ? fiyatGosterimServisi(site).gosterilecekFiyatlar(vt, kimlikler, { an })
      : new Map(),
  ]);
  const { simge, yer } = bicim.paraSimgesi();
  const ilkIndirimli = kimlikler
    .map((k) => fiyatlar.get(k))
    .find((f) => f !== undefined && f.indirimliFiyat !== null);
  const vitrin = basit ? gosterim.get(kimlikler[0] ?? "") : undefined;
  const [fiyatGecmisi, stokGecmisi] = await Promise.all([
    izinler.fiyat ? fiyatGecmisiSayfasiOku(birimler, degerAdlari) : undefined,
    izinler.stok ? stokGecmisiSayfasiOku(birimler, degerAdlari) : undefined,
  ]);
  return {
    fiyatGirisi: magaza.fiyatGirisi,
    simge,
    simgeYeri: yer,
    magazaEsigi: magaza.dusukStokEsigi,
    birimler: Object.fromEntries(
      birimler.map((b) => {
        const fiyat = fiyatlar.get(b.kimlik);
        return [
          birlesimAnahtari(b.degerler),
          {
            kimlik: b.kimlik,
            satisFiyati: fiyat === undefined ? "" : bicim.paraYazisi(fiyat.satisFiyati),
            indirimliFiyat:
              fiyat?.indirimliFiyat === null || fiyat === undefined
                ? ""
                : bicim.paraYazisi(fiyat.indirimliFiyat),
            stok: stoklar.get(b.kimlik)?.miktar ?? 0,
            ayrilan: ayrilanlar.get(b.kimlik) ?? 0,
          },
        ];
      }),
    ),
    indirimBaslangici:
      ilkIndirimli?.indirimBaslangici == null
        ? ""
        : yerelZamana(ilkIndirimli.indirimBaslangici, site.ayarlar.saatDilimi),
    indirimBitisi:
      ilkIndirimli?.indirimBitisi == null
        ? ""
        : yerelZamana(ilkIndirimli.indirimBitisi, site.ayarlar.saatDilimi),
    ...(vitrin === undefined
      ? {}
      : {
          vitrin: {
            tutar: vitrin.yazili.tutar,
            ...(vitrin.yazili.eskiTutar === undefined
              ? {}
              : { eskiTutar: vitrin.yazili.eskiTutar }),
            indirimde: vitrin.indirimde,
            ...(vitrin.ekMetin === undefined ? {} : { ekMetin: vitrin.ekMetin }),
            ...(vitrin.indirimBitisi === undefined
              ? {}
              : { bitis: bicim.tarihSaat(vitrin.indirimBitisi) }),
          },
        }),
    ...(fiyatGecmisi === undefined ? {} : { fiyatGecmisi }),
    ...(stokGecmisi === undefined ? {} : { stokGecmisi }),
  };
};
