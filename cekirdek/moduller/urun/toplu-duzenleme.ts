// Ürünlerin toplu düzenlemesi (kart 0314, karar 0189; taslak: planlar/tasarim-yonu/panel-2.html, "Toplu düzenleme"):
// seçilen ürünlerin fiyatı, stoğu ve kategorileri. Önce önizlenir, onaydan sonra uygulanır.
//
// - Önizleme ürünlerin bugünkü fiyatını, stoğunu ve kategorilerini toplu okur (ürün sayısıyla artmayan sorgular),
//   her birimin yeni değerini hesaplar ve ekranın gördüğü değerleri (gorulen) döndürür.
// - Uygulama her ürünü kendi veritabanı işleminde yazar: ürünün değerleri yeniden okunur, görülenle aynı değilse
//   (önizlemeden sonra değişti) ürün işlenmez. Fiyat yalnız fiyat servisiyle (fiyatYaz), stok yalnız stok servisiyle
//   (stokDuzelt), kategori yalnız ürün servisiyle (urunDegistir) değişir: geçmişler ve değişiklik kaydı yazanıyla
//   girer, servislerin kuralları aynen geçerlidir. Bir ürünün hatası ötekileri durdurmaz (TopluSonuc).
// - Yeni fiyat kuruşa yuvarlanır, yarım yukarı (karar 0185). Oran yüzdenin yüzde biri olarak tam sayıyla hesaplanır.
// - Kilit sırası servislerinkidir: fiyat ve kategori önce ürün kilidini alır (urun/kilit.ts); stok ürün kilidini hiç
//   almaz, birimler kimlik sırasıyla kilitlenir (stokDus'un sırası, karar 0068).
// - İzin kapıda denetlenir (işin izni urunTopluDuzenlemeleri'nde); servis yalnız kimin yaptığını kayda yazar.
import { and, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { hatayiKaydet } from "../../izleme/hata-katmani.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import { panelSayfaBoylari, type TopluSonuc } from "../../kayitlar/liste.ts";
import { elleStokSebepleri, stokSebepleri } from "../../kayitlar/stok.ts";
import {
  type TopluDegisimBirimi,
  type TopluFiyatHedefi,
  type TopluFiyatYontemi,
  type TopluStokYontemi,
  topluDegisimBirimleri,
  topluDuzenlemeSinirlari,
  topluFiyatHedefleri,
  topluFiyatYontemleri,
  topluStokYontemleri,
  type UrunTopluDuzenlemeNedeni,
  varyantSinirlari,
} from "../../kayitlar/urun.ts";
import { type Bicimleyici, yerelZamana, yerelZamandan } from "../../metinler/bicimleyici.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { kimligiDuzelt, kimlikSemasi } from "../../veritabani/kimlik.ts";
import type { fiyatServisi } from "../fiyat/servis.ts";
import { urunKategorileri } from "../kategori/model.ts";
import { birimStoklariniOku } from "../stok/durum.ts";
import { elleDuzeltme, enCokStok } from "../stok/semalar.ts";
import type { stokServisi } from "../stok/servis.ts";
import { baglantiTanimlari, gruplarGecerliMi } from "./baglantilar.ts";
import { urunKilidiAl } from "./kilit.ts";
import { urunBirimleri, urunler } from "./model.ts";
import { listeSinirlari } from "./semalar.ts";
import { secenekleriOku } from "./varyant.ts";

const yerelZaman = z.string().max(20).nullable().default(null);
const urunListesi = z
  .array(kimlikSemasi)
  .min(1)
  .max(panelSayfaBoylari[panelSayfaBoylari.length - 1] ?? 100);
const kategoriListesi = z.array(kimlikSemasi).min(1).max(topluDuzenlemeSinirlari.kategoriEnCok);

// Düzenlemenin girdisi. Tutar, oran ve miktar ekrandaki yazıdır (sitenin biçimiyle), sunucuda okunur.
export const topluDuzenlemeGirdisi = z.discriminatedUnion("islem", [
  z.strictObject({
    islem: z.literal("fiyat"),
    hedef: z.enum(topluFiyatHedefleri),
    yontem: z.enum(topluFiyatYontemleri),
    birim: z.enum(topluDegisimBirimleri),
    deger: z.string().trim().max(40),
    // Yalnız indirimli fiyatta. Boş zaman birimin kayıtlı zamanıdır (kullanıcı kararı).
    indirimBaslangici: yerelZaman,
    indirimBitisi: yerelZaman,
  }),
  z.strictObject({
    islem: z.literal("stok"),
    yontem: z.enum(topluStokYontemleri),
    miktar: z.string().trim().max(20),
    sebep: z.enum(elleStokSebepleri),
    not: z.string().max(1000).optional(),
  }),
  z.strictObject({ islem: z.literal("kategori-ekle"), kategoriler: kategoriListesi }),
  z.strictObject({ islem: z.literal("kategori-cikar"), kategoriler: kategoriListesi }),
]);
export type TopluDuzenlemeGirdisi = z.input<typeof topluDuzenlemeGirdisi>;

export const topluOnizlemeSemasi = z.strictObject({
  urunler: urunListesi,
  duzenleme: topluDuzenlemeGirdisi,
});

// Görülen değer: fiyatta satış ve indirimli fiyat (fiyatsız birimde ikisi de null), stokta miktar.
const gorulenDeger = z.union([
  z.strictObject({ satis: z.int().nullable(), indirimli: z.int().nullable() }),
  z.strictObject({ miktar: z.int() }),
]);
export type GorulenDeger = z.infer<typeof gorulenDeger>;

export const topluUygulamaSemasi = topluOnizlemeSemasi.extend({
  // Ürünün kimliğinden birimlerinin görülen değerlerine; kategori işinde boştur.
  gorulen: z
    .record(
      z.string().max(36),
      z
        .record(z.string().max(36), gorulenDeger)
        .refine((birimler) => Object.keys(birimler).length <= varyantSinirlari.birlesim),
    )
    .default({}),
});
export type TopluUygulamaGirdisi = z.input<typeof topluUygulamaSemasi>;

// Hazırlanmış düzenleme: yazılar okunmuş, kurallar denetlenmiş.
type Degisim = { birim: TopluDegisimBirimi; deger: number };
export type HazirDuzenleme =
  | {
      islem: "fiyat";
      hedef: TopluFiyatHedefi;
      yontem: TopluFiyatYontemi;
      degisim: Degisim;
      indirimBaslangici: string | null;
      indirimBitisi: string | null;
    }
  | { islem: "stok"; yontem: TopluStokYontemi; miktar: number; sebep: string; not?: string }
  | { islem: "kategori-ekle"; kategoriler: string[] }
  | { islem: "kategori-cikar"; kategoriler: string[] };

const dogrulama = (alan: string, kod: string) =>
  new BilinenHata("dogrulama", [{ alan: `duzenleme.${alan}`, kod }]);

// Ekranın yazısını okur. Oran yüzdenin yüzde biri olarak döner (%12,5 → 1250), tutar en küçük birimde.
export const duzenlemeyiHazirla = (
  girdi: z.output<typeof topluDuzenlemeGirdisi>,
  bicimleyici: Pick<Bicimleyici, "paraOku" | "sayiOku">,
  saatDilimi: string,
): HazirDuzenleme => {
  if (girdi.islem === "kategori-ekle") {
    return { islem: "kategori-ekle", kategoriler: [...new Set(girdi.kategoriler)] };
  }
  if (girdi.islem === "kategori-cikar") {
    return { islem: "kategori-cikar", kategoriler: [...new Set(girdi.kategoriler)] };
  }
  if (girdi.islem === "stok") {
    if (girdi.miktar === "") throw dogrulama("miktar", "too_small");
    if (!/^\d{1,10}$/.test(girdi.miktar)) throw dogrulama("miktar", "miktar-okunamadi");
    const miktar = Number(girdi.miktar);
    if (miktar > enCokStok) throw dogrulama("miktar", "stok-siniri");
    if (miktar === 0 && girdi.yontem !== "cek") throw dogrulama("miktar", "deger-sifir");
    // Notun kuralı stok servisininkidir (uzunluk, kayda yazılamayan değer; bağımsız kontrolün bulgusu): önizlemede
    // alanın hatası olur, her ürün ayrı ayrı reddedilmez.
    const notSonucu = elleDuzeltme.shape.not.safeParse(girdi.not ?? "");
    if (!notSonucu.success) {
      throw dogrulama("not", notSonucu.error.issues[0]?.message ?? "not-gecersiz");
    }
    const not = notSonucu.data ?? "";
    if (stokSebepleri[girdi.sebep].notZorunlu && not === "") throw dogrulama("not", "not-gerekli");
    return {
      islem: "stok",
      yontem: girdi.yontem,
      miktar,
      sebep: girdi.sebep,
      ...(not === "" ? {} : { not }),
    };
  }
  if (girdi.yontem === "satistan-indir" && girdi.hedef !== "indirimli") {
    throw dogrulama("yontem", "yontem-gecersiz");
  }
  if (girdi.deger === "") throw dogrulama("deger", "too_small");
  const deger =
    girdi.birim === "tutar"
      ? bicimleyici.paraOku(girdi.deger)
      : (() => {
          const oran = bicimleyici.sayiOku(girdi.deger, topluDuzenlemeSinirlari.oranOndalik);
          return oran === undefined ? undefined : Math.round(oran * 100);
        })();
  if (deger === undefined) {
    throw dogrulama("deger", girdi.birim === "tutar" ? "tutar-okunamadi" : "oran-okunamadi");
  }
  if (deger === 0) throw dogrulama("deger", "deger-sifir");
  if (girdi.birim === "oran") {
    const enCok =
      girdi.yontem === "artir"
        ? topluDuzenlemeSinirlari.artirmaOraniEnCok
        : topluDuzenlemeSinirlari.azaltmaOraniEnCok;
    if (deger > enCok * 100) throw dogrulama("deger", "oran-siniri");
  }
  const zamanlar = [girdi.indirimBaslangici, girdi.indirimBitisi];
  if (girdi.hedef === "satis" && zamanlar.some((zaman) => zaman !== null)) {
    throw dogrulama("indirimBaslangici", "indirim-zamani-indirimsiz");
  }
  const an = (alan: "indirimBaslangici" | "indirimBitisi") => {
    const yerel = girdi[alan];
    if (yerel === null || yerel === "") return null;
    if (yerelZamandan(yerel, saatDilimi) === undefined) {
      throw dogrulama(alan, "indirim-zamani-gecersiz");
    }
    return yerel;
  };
  const baslangic = an("indirimBaslangici");
  const bitis = an("indirimBitisi");
  if (
    baslangic !== null &&
    bitis !== null &&
    (yerelZamandan(bitis, saatDilimi)?.getTime() ?? 0) <=
      (yerelZamandan(baslangic, saatDilimi)?.getTime() ?? 0)
  ) {
    throw dogrulama("indirimBitisi", "indirim-sirasi");
  }
  return {
    islem: "fiyat",
    hedef: girdi.hedef,
    yontem: girdi.yontem,
    degisim: { birim: girdi.birim, deger },
    indirimBaslangici: baslangic,
    indirimBitisi: bitis,
  };
};

// Tutara oranı ya da tutarı uygular. Oran yüzdenin yüzde biridir; sonuç kuruşa yuvarlanır, yarım yukarı (karar
// 0185). Hesap tam sayıyla yapılır (BigInt): büyük tutarda kayan noktalı sayının yuvarlama hatası olmaz.
export const tutaraUygula = (eski: number, yon: "artir" | "azalt", degisim: Degisim): number => {
  if (degisim.birim === "tutar")
    return yon === "artir" ? eski + degisim.deger : eski - degisim.deger;
  const carpan = 10_000n + (yon === "artir" ? 1n : -1n) * BigInt(degisim.deger);
  const pay = BigInt(eski) * carpan;
  // Pay eksi olamaz: azaltma oranı en çok %100'dür.
  return Number((2n * pay + 10_000n) / 20_000n);
};

export type BirimSonucu =
  | { tur: "yeni"; satis: number; indirimli: number | null }
  | { tur: "atla"; neden: UrunTopluDuzenlemeNedeni }
  | { tur: "durdur"; neden: UrunTopluDuzenlemeNedeni };

// Birimin yeni fiyatı. Fiyatsız birim ve indirimsiz birimin indirimli fiyatı atlanır; sıfıra inen ya da satış
// fiyatından küçük olmayan indirimli fiyat ürünü durdurur.
export const yeniFiyat = (
  fiyat: { satis: number; indirimli: number | null } | undefined,
  d: Extract<HazirDuzenleme, { islem: "fiyat" }>,
): BirimSonucu => {
  if (fiyat === undefined) return { tur: "atla", neden: "fiyat-yok" };
  const { satis, indirimli } = fiyat;
  if (d.hedef === "satis") {
    const yeni = tutaraUygula(satis, d.yontem === "artir" ? "artir" : "azalt", d.degisim);
    if (yeni <= 0) return { tur: "durdur", neden: "sifira-iniyor" };
    if (indirimli !== null && indirimli >= yeni) return { tur: "durdur", neden: "indirim-buyuk" };
    return { tur: "yeni", satis: yeni, indirimli };
  }
  let yeni: number;
  if (d.yontem === "satistan-indir") yeni = tutaraUygula(satis, "azalt", d.degisim);
  else if (indirimli === null) return { tur: "atla", neden: "indirim-yok" };
  else yeni = tutaraUygula(indirimli, d.yontem === "artir" ? "artir" : "azalt", d.degisim);
  if (yeni <= 0) return { tur: "durdur", neden: "sifira-iniyor" };
  if (yeni >= satis) return { tur: "durdur", neden: "indirim-buyuk" };
  return { tur: "yeni", satis, indirimli: yeni };
};

// Birimin yeni stoğu. Takibi kapalı ürün atlanır; sıfırın altı ya da üst sınırın üstü ürünü durdurur.
export const yeniStok = (
  stok: { miktar: number; takip: boolean },
  d: Extract<HazirDuzenleme, { islem: "stok" }>,
):
  | { tur: "yeni"; miktar: number }
  | { tur: "atla" | "durdur"; neden: UrunTopluDuzenlemeNedeni } => {
  if (!stok.takip) return { tur: "atla", neden: "takip-kapali" };
  const yeni =
    d.yontem === "ekle"
      ? stok.miktar + d.miktar
      : d.yontem === "cikar"
        ? stok.miktar - d.miktar
        : d.miktar;
  if (yeni < 0) return { tur: "durdur", neden: "stok-eksi" };
  if (yeni > enCokStok) return { tur: "durdur", neden: "stok-siniri" };
  return { tur: "yeni", miktar: yeni };
};

type OkunanFiyat = {
  satisFiyati: number;
  indirimliFiyat: number | null;
  indirimBaslangici: Date | null;
  indirimBitisi: Date | null;
  paraBirimi: string;
};

// Ürünlerin bugünkü hâli, toplu: ad, takip, silinmemiş birimler (seçeneklerin değer sırasıyla, değerlerinin adı),
// fiyatlar, stoklar ve kategoriler. Silinmiş ya da olmayan ürün haritada yoktur.
type OkunanUrun = {
  kimlik: string;
  ad: string;
  birimler: { kimlik: string; degerler: string[] }[];
  kategoriler: string[];
};
type Okunan = {
  urunler: Map<string, OkunanUrun>;
  fiyatlar: Map<string, OkunanFiyat>;
  stoklar: Map<string, { miktar: number; takip: boolean }>;
};

const oku = async (
  vt: Veritabani | VeritabaniIslemi,
  kimlikler: string[],
  ne: "fiyat" | "stok" | "kategori",
  fiyat: ReturnType<typeof fiyatServisi>,
): Promise<Okunan> => {
  const sonuc: Okunan = { urunler: new Map(), fiyatlar: new Map(), stoklar: new Map() };
  if (kimlikler.length === 0) return sonuc;
  const satirlar = await vt
    .select({ kimlik: urunler.kimlik, ad: urunler.ad })
    .from(urunler)
    .where(and(inArray(urunler.kimlik, kimlikler), isNull(urunler.silinme_zamani)));
  for (const satir of satirlar) {
    sonuc.urunler.set(satir.kimlik, { ...satir, birimler: [], kategoriler: [] });
  }
  const bulunan = [...sonuc.urunler.keys()];
  if (bulunan.length === 0) return sonuc;
  if (ne === "kategori") {
    const baglar = await vt
      .select({ urun: urunKategorileri.urun_kimligi, kategori: urunKategorileri.kategori_kimligi })
      .from(urunKategorileri)
      .where(inArray(urunKategorileri.urun_kimligi, bulunan));
    for (const { urun, kategori } of baglar) sonuc.urunler.get(urun)?.kategoriler.push(kategori);
    return sonuc;
  }
  const [birimler, secenekler] = await Promise.all([
    vt
      .select({
        kimlik: urunBirimleri.kimlik,
        urun: urunBirimleri.urun_kimligi,
        birlesim: urunBirimleri.birlesim,
      })
      .from(urunBirimleri)
      .where(
        and(inArray(urunBirimleri.urun_kimligi, bulunan), isNull(urunBirimleri.silinme_zamani)),
      ),
    secenekleriOku(vt, bulunan, { silinmisler: false }),
  ]);
  // Değerler seçeneklerin sırasıyla; birimin sırası değerlerin seçeneklerdeki sırasıdır (ürün ekranının sırası).
  const sirali = new Map<string, { kimlik: string; degerler: string[]; sira: number[] }[]>();
  for (const birim of birimler) {
    const degerKimlikleri = new Set(birim.birlesim === "" ? [] : birim.birlesim.split(","));
    const sira: number[] = [];
    const degerler: string[] = [];
    for (const secenek of secenekler.get(birim.urun) ?? []) {
      const i = secenek.degerler.findIndex((deger) => degerKimlikleri.has(deger.kimlik));
      sira.push(i);
      const deger = secenek.degerler[i];
      if (deger !== undefined) degerler.push(deger.ad);
    }
    sirali.set(birim.urun, [
      ...(sirali.get(birim.urun) ?? []),
      { kimlik: birim.kimlik, degerler, sira },
    ]);
  }
  const karsilastir = (a: { kimlik: string; sira: number[] }, b: typeof a) => {
    for (let i = 0; i < Math.max(a.sira.length, b.sira.length); i += 1) {
      const fark = (a.sira[i] ?? 0) - (b.sira[i] ?? 0);
      if (fark !== 0) return fark;
    }
    return a.kimlik < b.kimlik ? -1 : a.kimlik > b.kimlik ? 1 : 0;
  };
  for (const [kimlik, liste] of sirali) {
    const urun = sonuc.urunler.get(kimlik);
    if (urun === undefined) continue;
    urun.birimler = liste
      .toSorted(karsilastir)
      .map(({ kimlik: birim, degerler }) => ({ kimlik: birim, degerler }));
  }
  const birimKimlikleri = birimler.map((birim) => birim.kimlik);
  if (ne === "fiyat") sonuc.fiyatlar = await fiyat.fiyatlariOku(vt, birimKimlikleri);
  else sonuc.stoklar = await birimStoklariniOku(vt, birimKimlikleri);
  return sonuc;
};

export type OnizlemeBirimi = {
  kimlik: string;
  // Birleşimin değerlerinin adları, seçeneklerin sırasıyla; basit üründe boş.
  degerler: string[];
  // Fiyatta: birimin satış fiyatı (bağlam), değişen fiyatın eski ve yeni hâli; stokta miktarlar. Atlanan ya da
  // durduran birimde yeni yoktur.
  satis: number | null;
  eski: number | null;
  yeni: number | null;
  // Uygulanınca birim değişir mi (tutar, miktar ya da indirimin zamanı).
  degisir: boolean;
  neden?: UrunTopluDuzenlemeNedeni;
  // Fiyatta yazılacak fiyatın tamamı (fiyat servisinin girdisi); ekrana gitmez.
  yazilacak?: {
    satisFiyati: number;
    indirimliFiyat: number | null;
    indirimBaslangici: string | null;
    indirimBitisi: string | null;
  };
};

export type OnizlemeUrunu = {
  kimlik: string;
  ad: string;
  // Uygulanınca bir şey değişir mi (kategori zaten bağlıysa, fiyat yuvarlanınca aynı kalıyorsa değişmez).
  degisir: boolean;
  // Ürün işlenemezse nedeni.
  neden?: UrunTopluDuzenlemeNedeni;
  birimler: OnizlemeBirimi[];
};

type Hesap = { urun: OnizlemeUrunu; gorulen: Record<string, GorulenDeger> };

type Baglam = { paraBirimi: string; saatDilimi: string; an: Date };

// Birimin bugünkü fiyatı: başka para birimindeki fiyat yok sayılır. Bitişi geçmiş indirim yok sayılır (bağımsız
// kontrolün bulgusu): zamanı yeni indirime taşınmaz, satış fiyatı değişince silinir.
const etkinFiyat = (fiyat: OkunanFiyat | undefined, b: Baglam) => {
  if (fiyat === undefined || fiyat.paraBirimi !== b.paraBirimi) return undefined;
  const bitmis = fiyat.indirimBitisi !== null && fiyat.indirimBitisi.getTime() <= b.an.getTime();
  const indirimVar = fiyat.indirimliFiyat !== null && !bitmis;
  const yerel = (an: Date | null) => (an === null ? null : yerelZamana(an, b.saatDilimi));
  return {
    satis: fiyat.satisFiyati,
    indirimli: indirimVar ? fiyat.indirimliFiyat : null,
    baslangic: indirimVar ? yerel(fiyat.indirimBaslangici) : null,
    bitis: indirimVar ? yerel(fiyat.indirimBitisi) : null,
    // Kayıttaki hâli (değişip değişmediği bununla karşılaştırılır).
    kayitli: {
      satisFiyati: fiyat.satisFiyati,
      indirimliFiyat: fiyat.indirimliFiyat,
      indirimBaslangici: yerel(fiyat.indirimBaslangici),
      indirimBitisi: yerel(fiyat.indirimBitisi),
    },
  };
};

// Birimin yazılacak fiyatı: hesap (yeniFiyat) ve indirimin zamanı. Satış fiyatında indirim ve zamanı kalır;
// indirimli fiyatta verilen zaman yazılır, verilmeyen birimin kayıtlı zamanıdır (yeni indirimde yoktur, kullanıcı
// kararı). Bitiş başlangıçtan sonra değilse birim ürünü durdurur (önizlemede görünür).
const birimFiyati = (
  fiyat: ReturnType<typeof etkinFiyat>,
  d: Extract<HazirDuzenleme, { islem: "fiyat" }>,
  b: Baglam,
):
  | { tur: "yeni"; yazilacak: NonNullable<OnizlemeBirimi["yazilacak"]> }
  | { tur: "atla" | "durdur"; neden: UrunTopluDuzenlemeNedeni } => {
  const sonuc = yeniFiyat(fiyat, d);
  if (sonuc.tur !== "yeni") return sonuc;
  const zaman = (alan: "indirimBaslangici" | "indirimBitisi") => {
    if (sonuc.indirimli === null) return null;
    const kayitli =
      alan === "indirimBaslangici" ? (fiyat?.baslangic ?? null) : (fiyat?.bitis ?? null);
    return d.hedef === "satis" ? kayitli : (d[alan] ?? kayitli);
  };
  const baslangic = zaman("indirimBaslangici");
  const bitis = zaman("indirimBitisi");
  if (
    baslangic !== null &&
    bitis !== null &&
    (yerelZamandan(bitis, b.saatDilimi)?.getTime() ?? 0) <=
      (yerelZamandan(baslangic, b.saatDilimi)?.getTime() ?? 0)
  ) {
    return { tur: "durdur", neden: "indirim-sirasi" };
  }
  return {
    tur: "yeni",
    yazilacak: {
      satisFiyati: sonuc.satis,
      indirimliFiyat: sonuc.indirimli,
      indirimBaslangici: baslangic,
      indirimBitisi: bitis,
    },
  };
};

// Bir ürünün sonucu: birim birim hesap, atlanan birimler, durduran ilk neden.
const hesapla = (kimlik: string, okunan: Okunan, d: HazirDuzenleme, b: Baglam): Hesap => {
  const urun = okunan.urunler.get(kimlik);
  if (urun === undefined) {
    return {
      urun: { kimlik, ad: "", degisir: false, neden: "bulunamadi", birimler: [] },
      gorulen: {},
    };
  }
  if (d.islem === "kategori-ekle" || d.islem === "kategori-cikar") {
    const bagli = new Set(urun.kategoriler);
    const degisir =
      d.islem === "kategori-ekle"
        ? d.kategoriler.some((k) => !bagli.has(k))
        : d.kategoriler.some((k) => bagli.has(k));
    // Ürünün kategori sınırı (ürün servisinin şeması) önizlemede söylenir (bağımsız kontrolün bulgusu).
    const sinirda =
      d.islem === "kategori-ekle" &&
      new Set([...bagli, ...d.kategoriler]).size > listeSinirlari.grup;
    return {
      urun: {
        kimlik,
        ad: urun.ad,
        degisir: degisir && !sinirda,
        ...(sinirda ? { neden: "kategori-siniri" as const } : {}),
        birimler: [],
      },
      gorulen: {},
    };
  }
  const gorulen: Record<string, GorulenDeger> = {};
  const birimler: OnizlemeBirimi[] = [];
  let durduran: UrunTopluDuzenlemeNedeni | undefined;
  let degisir = false;
  let atlanan: UrunTopluDuzenlemeNedeni | undefined;
  for (const birim of urun.birimler) {
    if (d.islem === "fiyat") {
      const okunanFiyat = okunan.fiyatlar.get(birim.kimlik);
      const fiyat = etkinFiyat(okunanFiyat, b);
      gorulen[birim.kimlik] = {
        satis: fiyat?.kayitli.satisFiyati ?? null,
        indirimli: fiyat?.kayitli.indirimliFiyat ?? null,
      };
      const sonuc = birimFiyati(fiyat, d, b);
      const eski = d.hedef === "satis" ? (fiyat?.satis ?? null) : (fiyat?.indirimli ?? null);
      const satir = { kimlik: birim.kimlik, degerler: birim.degerler, satis: fiyat?.satis ?? null };
      if (sonuc.tur === "yeni") {
        const yeni =
          d.hedef === "satis" ? sonuc.yazilacak.satisFiyati : sonuc.yazilacak.indirimliFiyat;
        const birimDegisir = JSON.stringify(sonuc.yazilacak) !== JSON.stringify(fiyat?.kayitli);
        if (birimDegisir) degisir = true;
        birimler.push({ ...satir, eski, yeni, degisir: birimDegisir, yazilacak: sonuc.yazilacak });
      } else {
        birimler.push({ ...satir, eski, yeni: null, degisir: false, neden: sonuc.neden });
        if (sonuc.tur === "durdur") durduran ??= sonuc.neden;
        else atlanan ??= sonuc.neden;
      }
    } else {
      const stok = okunan.stoklar.get(birim.kimlik) ?? { miktar: 0, takip: false };
      gorulen[birim.kimlik] = { miktar: stok.miktar };
      const sonuc = yeniStok(stok, d);
      const satir = {
        kimlik: birim.kimlik,
        degerler: birim.degerler,
        satis: null,
        eski: stok.miktar,
      };
      if (sonuc.tur === "yeni") {
        const birimDegisir = sonuc.miktar !== stok.miktar;
        if (birimDegisir) degisir = true;
        birimler.push({ ...satir, yeni: sonuc.miktar, degisir: birimDegisir });
      } else {
        birimler.push({ ...satir, yeni: null, degisir: false, neden: sonuc.neden });
        if (sonuc.tur === "durdur") durduran ??= sonuc.neden;
        else atlanan ??= sonuc.neden;
      }
    }
  }
  // Hiçbir birimi işlenemeyen ürün atlanan birimin nedeniyle işlenmez.
  const islenenVar = birimler.some((birim) => birim.neden === undefined);
  const neden = durduran ?? (islenenVar ? undefined : (atlanan ?? "fiyat-yok"));
  return {
    urun: {
      kimlik,
      ad: urun.ad,
      degisir: neden === undefined && degisir,
      ...(neden === undefined ? {} : { neden }),
      birimler,
    },
    gorulen,
  };
};

type Servisler = {
  fiyat: ReturnType<typeof fiyatServisi>;
  stok: ReturnType<typeof stokServisi>;
  urunDegistir: (
    vt: Veritabani | VeritabaniIslemi,
    kim: DegisikligiYapan,
    kimlik: string,
    girdi: { kategoriler: string[] },
  ) => Promise<unknown>;
  bicimleyici: Pick<Bicimleyici, "paraOku" | "sayiOku">;
  saatDilimi: string;
  paraBirimi: string;
};

const okunacak = (d: HazirDuzenleme) =>
  d.islem === "fiyat" ? "fiyat" : d.islem === "stok" ? "stok" : "kategori";

// Seçilen kategoriler var ve silinmemiş mi (işlemin içinde, paylaşımlı kilitle).
const kategorileriDenetle = async (islem: VeritabaniIslemi, kategoriler: string[]) => {
  const tanim = baglantiTanimlari.find((t) => t.alan === "kategoriler");
  if (tanim === undefined) throw new Error("Kategori bağlantısının tanımı yok.");
  return gruplarGecerliMi(islem, tanim, kategoriler);
};

const girdiyiDogrula = <T>(sonuc: z.ZodSafeParseResult<T>): T => {
  if (sonuc.success) return sonuc.data;
  throw new BilinenHata(
    "dogrulama",
    sonuc.error.issues.map((s) => ({ alan: s.path.join("."), kod: s.code })),
  );
};

export type Onizleme = {
  urunler: OnizlemeUrunu[];
  // Değişecek ürünlerin görülen değerleri: uygulama bunlarla gönderilir.
  gorulen: Record<string, Record<string, GorulenDeger>>;
};

// Önizleme: seçilen ürünlerin sonucu, seçim sırasıyla. Hiçbir şey yazılmaz. Silinmiş kategori seçilmişse (kaldırma
// dışında) alanın hatası döner.
export const topluOnizle = async (
  vt: Veritabani,
  ham: z.input<typeof topluOnizlemeSemasi>,
  servisler: Servisler,
): Promise<Onizleme> => {
  const girdi = girdiyiDogrula(topluOnizlemeSemasi.safeParse(ham));
  const d = duzenlemeyiHazirla(girdi.duzenleme, servisler.bicimleyici, servisler.saatDilimi);
  const kimlikler = [...new Set(girdi.urunler)];
  return vt.transaction(async (islem) => {
    if (d.islem === "kategori-ekle" && !(await kategorileriDenetle(islem, d.kategoriler))) {
      throw dogrulama("kategoriler", "kategori-gecersiz");
    }
    const okunan = await oku(islem, kimlikler, okunacak(d), servisler.fiyat);
    const sonuc: Onizleme = { urunler: [], gorulen: {} };
    for (const kimlik of kimlikler) {
      const { urun, gorulen } = hesapla(kimlik, okunan, d, baglam(servisler));
      sonuc.urunler.push(urun);
      if (urun.degisir) sonuc.gorulen[kimlik] = gorulen;
    }
    return sonuc;
  });
};

class Islenemedi extends Error {
  constructor(readonly neden: string) {
    super(neden);
  }
}

const ayniMi = (a: Record<string, GorulenDeger>, b: Record<string, GorulenDeger> | undefined) => {
  if (b === undefined) return false;
  const normal = (r: Record<string, GorulenDeger>) =>
    JSON.stringify(
      Object.entries(r)
        .map(([birim, deger]) => [kimligiDuzelt(birim), deger] as const)
        .toSorted(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0)),
    );
  return normal(a) === normal(b);
};

const baglam = (servisler: Servisler): Baglam => ({
  paraBirimi: servisler.paraBirimi,
  saatDilimi: servisler.saatDilimi,
  an: new Date(),
});

// Uygulama: her ürün kendi işleminde. Ürünün bugünkü değerleri görülenle aynı değilse "degisti"; değişmeyen ürün
// yazılmadan işlenmiş sayılır. İşlenemeyen ürün nedeninin koduyla döner.
export const topluUygula = async (
  vt: Veritabani,
  kim: DegisikligiYapan,
  ham: TopluUygulamaGirdisi,
  servisler: Servisler,
): Promise<TopluSonuc> => {
  const girdi = girdiyiDogrula(topluUygulamaSemasi.safeParse(ham));
  const d = duzenlemeyiHazirla(girdi.duzenleme, servisler.bicimleyici, servisler.saatDilimi);
  const gorulenler = new Map(
    Object.entries(girdi.gorulen).map(([urun, birimler]) => [kimligiDuzelt(urun), birimler]),
  );
  const sonuc: TopluSonuc = { islenen: [], islenemeyen: [] };
  for (const kimlik of new Set(girdi.urunler)) {
    try {
      await vt.transaction(async (islem) => {
        // Fiyat ve kategori ürün servisinin kilidiyle yazılır: değerler kilitten sonra okunur.
        if (d.islem !== "stok") await urunKilidiAl(islem);
        // Önizlemeden sonra silinen kategoriyi ürün servisi "kategori-gecersiz" ile reddeder (urunDegistir).
        const okunan = await oku(islem, [kimlik], okunacak(d), servisler.fiyat);
        const { urun, gorulen } = hesapla(kimlik, okunan, d, baglam(servisler));
        // Önce değişip değişmediği: önizlemeden sonra değişen ürünün nedeni "degisti"dir, yeni hâlinin nedeni değil.
        // Silinmiş ürün bulunamadı kalır. Görülen değeri olmayan ürün (önizlemede değişmeyen) kendi nedeniyle
        // döner; değişecekse önizlenmemiştir.
        const fiyatStok = d.islem === "fiyat" || d.islem === "stok";
        const gorulenDegerler = gorulenler.get(kimlik);
        if (fiyatStok && urun.neden !== "bulunamadi" && gorulenDegerler !== undefined) {
          if (!ayniMi(gorulen, gorulenDegerler)) throw new Islenemedi("degisti");
        }
        if (urun.neden !== undefined) throw new Islenemedi(urun.neden);
        if (fiyatStok && gorulenDegerler === undefined && urun.degisir) {
          throw new Islenemedi("degisti");
        }
        if (!urun.degisir) return;
        if (d.islem === "kategori-ekle" || d.islem === "kategori-cikar") {
          const bagli = okunan.urunler.get(kimlik)?.kategoriler ?? [];
          const yeni =
            d.islem === "kategori-ekle"
              ? [...new Set([...bagli, ...d.kategoriler])]
              : bagli.filter((k) => !d.kategoriler.includes(k));
          await servisler.urunDegistir(islem, kim, kimlik, { kategoriler: yeni });
          return;
        }
        if (d.islem === "fiyat") {
          for (const birim of urun.birimler) {
            if (birim.degisir && birim.yazilacak !== undefined) {
              await servisler.fiyat.fiyatYaz(islem, kim, birim.kimlik, birim.yazilacak);
            }
          }
          return;
        }
        // Stok: birimler kimlik sırasıyla kilitlenir; görülen miktar stok servisinde yeniden denetlenir.
        const stoklar = urun.birimler
          .filter((birim) => birim.degisir)
          .toSorted((a, b) => (a.kimlik < b.kimlik ? -1 : a.kimlik > b.kimlik ? 1 : 0));
        for (const birim of stoklar) {
          await servisler.stok.stokDuzelt(islem, kim, birim.kimlik, {
            yeniMiktar: birim.yeni ?? 0,
            gorulenMiktar: birim.eski ?? 0,
            sebep: d.sebep as (typeof elleStokSebepleri)[number],
            ...(d.not === undefined ? {} : { not: d.not }),
          });
        }
      });
      sonuc.islenen.push(kimlik);
    } catch (hata) {
      sonuc.islenemeyen.push({ anahtar: kimlik, kod: nedenKodu(hata) });
    }
  }
  return sonuc;
};

// Hatanın nedeni: kendi nedenimiz, servisin bilinen hatasının alan kodu (fiyat servisinin "indirim-sirasi",
// stok servisinin "stok-degisti") ya da kodu; beklenmeyen hata kaydedilir.
const nedenKodu = (hata: unknown): string => {
  if (hata instanceof Islenemedi) return hata.neden;
  if (hata instanceof BilinenHata) {
    const ayrinti = Array.isArray(hata.ayrinti)
      ? (hata.ayrinti[0] as { kod?: unknown } | undefined)
      : undefined;
    const kod = typeof ayrinti?.kod === "string" ? ayrinti.kod : hata.kod;
    return kod === "stok-degisti" ? "degisti" : kod;
  }
  hatayiKaydet(hata, { islem: "urun-toplu-duzenleme" });
  return "beklenmeyen";
};
